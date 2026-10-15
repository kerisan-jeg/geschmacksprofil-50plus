// Auswertung der Kontrollkarten (Messkonzept, docs/messkonzept.md). Reine Funktionen ohne Dateizugriff;
// scripts/evaluate.mjs liest die Exporte (JSON aus der Ansicht für die Testleitung) und schreibt die Tabellen.
//
// Grundidee: Das Protokoll speichert die rohen Antworten. Darum lässt sich nachträglich ausrechnen, was die
// App nach den ersten k Antworten über die Kontrollkarten vermutet hätte (gleiches Modell wie in der App,
// src/logic/preferences.js). Der Vergleich mit den echten Antworten am Ende ergibt die Lernkurve.
//
// Kennzahlen je Person (jede Person zählt gleich viel), dann gemittelt:
//   Trefferquote       richtig vermutete Richtung / Kontrollkarten mit Bewertung (ohne Vermutung = nicht richtig)
//   Abdeckung          Kontrollkarten mit Vermutung / Kontrollkarten mit Bewertung
//   Treffer bei Vermutung  richtig / Kontrollkarten mit Vermutung
//   Vollständigkeit    sichtbare Karten mit Antwort oder Vermutung / alle sichtbaren Karten (nicht Genauigkeit!)
// Vergleichswerte: „immer Mag ich“ und „andere Personen“ (Mittel der anderen Personen für dieselbe Karte).
// Unsicherheit: 95-%-Bootstrap-Intervall über Personen (feste Zufallsfolge, damit wiederholbar).
// „Kenne ich nicht“ und „Vertrage ich nicht“ bei Kontrollkarten sind keine Bewertung und werden separat gezählt.

import { PREFERENCE_MODEL } from '../config.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR, isTasteSignal } from '../logic/answers.js';
import { deriveRoundState, replay } from '../logic/engine.js';
import { ANSWER, HOLDOUT_DRAWN, PHASE_HOLDOUT, eventType } from '../logic/events.js';
import { isVisible } from '../logic/filter.js';
import { seededRandom } from '../logic/holdout.js';
import { directScore, predictedRating, predictScores } from '../logic/preferences.js';

export const RESAMPLES = 2000;

// Modellvarianten für die Empfindlichkeitsanalyse (gleiche Daten, andere Annahmen).
export const MODEL_VARIANTS = [
  { id: 'standard', label: 'Standard (Faktor 0.5, ohne Geschwister)', model: PREFERENCE_MODEL },
  { id: 'factor-0.25', label: 'Faktor 0.25', model: { ...PREFERENCE_MODEL, inheritFactor: 0.25 } },
  { id: 'factor-1', label: 'Faktor 1', model: { ...PREFERENCE_MODEL, inheritFactor: 1 } },
  { id: 'dislike-2', label: 'Mag ich nicht −2', model: { ...PREFERENCE_MODEL, weights: { ...PREFERENCE_MODEL.weights, DISLIKE: -2 } } },
  { id: 'siblings-1', label: 'mit Geschwistern (Gewicht 1)', model: { ...PREFERENCE_MODEL, siblingWeight: 1 } },
  { id: 'siblings-3', label: 'mit Geschwistern (Gewicht 3)', model: { ...PREFERENCE_MODEL, siblingWeight: 3 } },
];

export function sameDirection(guess, actual) {
  return guess === DISLIKE ? actual === DISLIKE : actual === LIKE || actual === PREFER;
}

const mean = (values) => (values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length);

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function quantile(sorted, q) {
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

// 95-%-Intervall des Mittelwerts durch Ziehen mit Zurücklegen (Personen als Einheit).
export function bootstrapInterval(values, { resamples = RESAMPLES, seed = 'bootstrap' } = {}) {
  if (values.length === 0) return [null, null];
  if (values.length === 1) return [values[0], values[0]];
  const random = seededRandom(seed);
  const means = [];
  for (let i = 0; i < resamples; i += 1) {
    let sum = 0;
    for (let j = 0; j < values.length; j += 1) sum += values[Math.floor(random() * values.length)];
    means.push(sum / values.length);
  }
  means.sort((a, b) => a - b);
  return [quantile(means, 0.025), quantile(means, 0.975)];
}

// Eine Sitzung (wie im JSON-Export) für die Auswertung aufbereiten.
// main: Antworten der normalen Auswahl in der Reihenfolge des Wischens (nach Rückgängig),
// checks: Antworten auf die Kontrollkarten, visible: am Ende sichtbare Karten (für die Vollständigkeit).
export function prepareSession(session, { index, diets }) {
  const events = session.events ?? [];
  const drawn =
    events.filter((event) => eventType(event) === HOLDOUT_DRAWN).at(-1)?.cardIds ??
    [...new Set(events.filter((event) => eventType(event) === ANSWER && event.phase === PHASE_HOLDOUT).map((event) => event.cardId))];
  const holdout = new Set(drawn);
  const played = replay(events);
  const main = played.sequence.filter((id) => !holdout.has(id)).map((cardId) => ({ cardId, response: played.answers[cardId] }));
  const checks = drawn.filter((id) => id in played.answers).map((cardId) => ({ cardId, response: played.answers[cardId] }));
  const state = deriveRoundState({ index, onboarding: session.onboarding ?? null, diets, events });
  const visible = index.cards.filter((card) => isVisible(card, index, state.exclusions)).map((card) => card.id);
  const answerEvents = played.sequence.map((id) => events[played.answeredAt[id]]);
  const times = answerEvents.map((event) => event.timestamp).filter(Boolean).map((stamp) => Date.parse(stamp));
  return {
    sessionId: session.sessionId,
    participantCode: session.participantCode ?? null,
    ageGroup: session.onboarding?.ageGroup ?? null,
    selection: session.config?.selection ?? 'fixed',
    roundCardLimit: session.config?.roundCardLimit ?? null,
    holdout: drawn,
    main,
    checks,
    visible,
    rounds: Math.max(0, ...answerEvents.map((event) => event.round ?? 1)),
    undos: events.filter((event) => event.response === 'UNDO').length,
    durationMs: session.endedAt && session.startedAt ? Date.parse(session.endedAt) - Date.parse(session.startedAt) : null,
    swipeMs: times.length > 1 ? Math.max(...times) - Math.min(...times) : null,
    medianResponseTimeMs: median(answerEvents.map((event) => event.responseTimeMs).filter((value) => typeof value === 'number')),
  };
}

// Was die App nach den ersten k Antworten der normalen Auswahl über die Kontrollkarten vermutet hätte.
export function scoreAfter(index, data, k, model = PREFERENCE_MODEL) {
  const first = data.main.slice(0, k);
  const ratings = Object.fromEntries(first.map((answer) => [answer.cardId, answer.response]));
  const predictions = predictScores(index, ratings, model);
  const items = [];
  let usable = 0;
  let predicted = 0;
  let correct = 0;
  for (const check of data.checks) {
    if (!isTasteSignal(check.response)) continue;
    usable += 1;
    const prediction = predictions.get(check.cardId);
    const guess = prediction && !prediction.direct ? predictedRating(prediction.score) : null;
    const hit = guess ? sameDirection(guess, check.response) : false;
    if (guess) predicted += 1;
    if (hit) correct += 1;
    items.push({ cardId: check.cardId, actual: check.response, guess, score: prediction?.score ?? null, basisId: prediction?.basisId ?? null, hit });
  }
  const answered = new Set(first.map((answer) => answer.cardId));
  const covered = data.visible.filter((id) => answered.has(id) || predictedRating(predictions.get(id)?.score)).length;
  return { usable, predicted, correct, items, completeness: data.visible.length > 0 ? covered / data.visible.length : 0 };
}

// „Immer Mag ich“: Anteil der Kontrollkarten mit „Mag ich“ oder „Mag ich sehr“.
export function majorityBaseline(data) {
  const usable = data.checks.filter((check) => isTasteSignal(check.response));
  return { usable: usable.length, predicted: usable.length, correct: usable.filter((check) => check.response !== DISLIKE).length };
}

// „Andere Personen“: Mittel der direkten Bewertungen aller anderen Personen für dieselbe Karte (ohne die Person selbst).
export function othersBaseline(datas, model = PREFERENCE_MODEL) {
  const byCard = new Map();
  for (const data of datas) {
    for (const answer of [...data.main, ...data.checks]) {
      const score = directScore(answer.response, model);
      if (score === null) continue;
      if (!byCard.has(answer.cardId)) byCard.set(answer.cardId, []);
      byCard.get(answer.cardId).push({ sessionId: data.sessionId, score });
    }
  }
  const results = new Map();
  for (const data of datas) {
    let usable = 0;
    let predicted = 0;
    let correct = 0;
    for (const check of data.checks) {
      if (!isTasteSignal(check.response)) continue;
      usable += 1;
      const others = (byCard.get(check.cardId) ?? []).filter((entry) => entry.sessionId !== data.sessionId);
      const guess = predictedRating(mean(others.map((entry) => entry.score)));
      if (!guess) continue;
      predicted += 1;
      if (sameDirection(guess, check.response)) correct += 1;
    }
    results.set(data.sessionId, { usable, predicted, correct });
  }
  return results;
}

const share = (result) => (result.usable > 0 ? result.correct / result.usable : null);

// Lernkurve: je k (Anzahl Antworten der normalen Auswahl) die Kennzahlen über alle Personen, die mindestens
// k Karten beantwortet haben und mindestens eine bewertete Kontrollkarte haben.
export function learningCurve(datas, { index, model = PREFERENCE_MODEL, ks = null, resamples = RESAMPLES, seed = 'lernkurve' } = {}) {
  const persons = datas.filter((data) => data.checks.some((check) => isTasteSignal(check.response)));
  const others = othersBaseline(datas, model);
  const longest = Math.max(0, ...persons.map((data) => data.main.length));
  const steps = ks ?? Array.from({ length: longest + 1 }, (_, k) => k);
  return steps.map((k) => {
    const group = persons.filter((data) => data.main.length >= k);
    const rows = group.map((data) => {
      const result = scoreAfter(index, data, k, model);
      return {
        accuracy: share(result),
        coverage: result.predicted / result.usable,
        hitRate: result.predicted > 0 ? result.correct / result.predicted : null,
        completeness: result.completeness,
        majority: share(majorityBaseline(data)),
        others: share(others.get(data.sessionId)),
        checks: result.usable,
      };
    });
    const pick = (field) => rows.map((row) => row[field]).filter((value) => value !== null);
    const diffs = (field) => rows.map((row) => row.accuracy - row[field]);
    const [low, high] = bootstrapInterval(pick('accuracy'), { resamples, seed: `${seed}:${k}` });
    const [majorityLow, majorityHigh] = bootstrapInterval(diffs('majority'), { resamples, seed: `${seed}:${k}:majority` });
    const [othersLow, othersHigh] = bootstrapInterval(diffs('others'), { resamples, seed: `${seed}:${k}:others` });
    return {
      k,
      sessions: group.length,
      checks: rows.reduce((sum, row) => sum + row.checks, 0),
      accuracy: mean(pick('accuracy')),
      accuracyLow: low,
      accuracyHigh: high,
      coverage: mean(pick('coverage')),
      hitRate: mean(pick('hitRate')),
      completeness: mean(pick('completeness')),
      baselineMajority: mean(pick('majority')),
      baselineOthers: mean(pick('others')),
      diffMajority: mean(diffs('majority')),
      diffMajorityLow: majorityLow,
      diffMajorityHigh: majorityHigh,
      diffOthers: mean(diffs('others')),
      diffOthersLow: othersLow,
      diffOthersHigh: othersHigh,
    };
  });
}

// Vorschlag für das Kriterium (vom Team vor der Hauptstudie festzulegen, siehe Messkonzept): das kleinste k,
// ab dem die Untergrenze des 95-%-Intervalls der Differenz zu beiden Vergleichswerten über 0 liegt,
// bei mindestens minSessions Personen.
export function firstSufficientK(curve, { minSessions = 5 } = {}) {
  return curve.find((row) => row.sessions >= minSessions && row.diffMajorityLow > 0 && row.diffOthersLow > 0)?.k ?? null;
}

// Gleiche Daten, andere Annahmen: Trefferquote mit allen Antworten der normalen Auswahl.
export function compareVariants(datas, { index, variants = MODEL_VARIANTS, resamples = RESAMPLES } = {}) {
  const persons = datas.filter((data) => data.checks.some((check) => isTasteSignal(check.response)));
  return variants.map((variant) => {
    const results = persons.map((data) => scoreAfter(index, data, data.main.length, variant.model));
    const accuracy = results.map(share).filter((value) => value !== null);
    const [low, high] = bootstrapInterval(accuracy, { resamples, seed: `variant:${variant.id}` });
    return {
      id: variant.id,
      label: variant.label,
      sessions: persons.length,
      accuracy: mean(accuracy),
      accuracyLow: low,
      accuracyHigh: high,
      coverage: mean(results.map((result) => result.predicted / result.usable)),
    };
  });
}

// Antworten auf die Kontrollkarten, über alle Personen gezählt.
export function checkCounts(datas) {
  const counts = { drawn: 0, answered: 0, [LIKE]: 0, [PREFER]: 0, [DISLIKE]: 0, [UNFAMILIAR]: 0, [INTOLERANT]: 0 };
  for (const data of datas) {
    counts.drawn += data.holdout.length;
    counts.answered += data.checks.length;
    for (const check of data.checks) counts[check.response] += 1;
  }
  return counts;
}

// Alles zusammen: Sitzungen aufbereiten, je Auswahlverfahren eine Lernkurve, Varianten, Einzelwerte.
export function evaluate(sessions, { index, diets, resamples = RESAMPLES, minSessions = 5 } = {}) {
  const datas = sessions.map((session) => prepareSession(session, { index, diets }));
  const modes = [...new Set(datas.map((data) => data.selection))].sort();
  const curves = modes.map((mode) => {
    const group = datas.filter((data) => data.selection === mode);
    const curve = learningCurve(group, { index, resamples, seed: `lernkurve:${mode}` });
    return { selection: mode, sessions: group.length, curve, firstSufficientK: firstSufficientK(curve, { minSessions }) };
  });
  const checks = datas.flatMap((data) => {
    const final = scoreAfter(index, data, data.main.length);
    const byCard = new Map(final.items.map((item) => [item.cardId, item]));
    return data.checks.map((check) => ({
      sessionId: data.sessionId,
      participantCode: data.participantCode,
      selection: data.selection,
      mainAnswers: data.main.length,
      cardId: check.cardId,
      actual: check.response,
      guess: byCard.get(check.cardId)?.guess ?? null,
      score: byCard.get(check.cardId)?.score ?? null,
      basisId: byCard.get(check.cardId)?.basisId ?? null,
      hit: byCard.get(check.cardId)?.hit ?? null,
    }));
  });
  return { datas, curves, variants: compareVariants(datas, { index, resamples }), checks, counts: checkCounts(datas) };
}

// ---------- Ausgabe ----------

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(4) : String(value);
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows, columns) {
  return `${[columns.join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))].join('\r\n')}\r\n`;
}

export const CURVE_COLUMNS = [
  'selection', 'k', 'sessions', 'checks', 'accuracy', 'accuracyLow', 'accuracyHigh', 'coverage', 'hitRate', 'completeness',
  'baselineMajority', 'baselineOthers', 'diffMajority', 'diffMajorityLow', 'diffMajorityHigh', 'diffOthers', 'diffOthersLow', 'diffOthersHigh',
];
export const CHECK_COLUMNS = ['sessionId', 'participantCode', 'selection', 'mainAnswers', 'cardId', 'actual', 'guess', 'score', 'basisId', 'hit'];
export const SESSION_COLUMNS = [
  'sessionId', 'participantCode', 'ageGroup', 'selection', 'roundCardLimit', 'mainAnswers', 'checksDrawn', 'checksAnswered', 'checksRated',
  'rounds', 'undos', 'durationMs', 'swipeMs', 'medianResponseTimeMs', 'accuracyAtEnd',
];
export const VARIANT_COLUMNS = ['id', 'label', 'sessions', 'accuracy', 'accuracyLow', 'accuracyHigh', 'coverage'];

export function sessionRows(index, datas) {
  return datas.map((data) => {
    const final = scoreAfter(index, data, data.main.length);
    return {
      sessionId: data.sessionId,
      participantCode: data.participantCode,
      ageGroup: data.ageGroup,
      selection: data.selection,
      roundCardLimit: data.roundCardLimit,
      mainAnswers: data.main.length,
      checksDrawn: data.holdout.length,
      checksAnswered: data.checks.length,
      checksRated: final.usable,
      rounds: data.rounds,
      undos: data.undos,
      durationMs: data.durationMs,
      swipeMs: data.swipeMs,
      medianResponseTimeMs: data.medianResponseTimeMs,
      accuracyAtEnd: share(final),
    };
  });
}

const percent = (value) => (value === null || value === undefined ? '–' : `${Math.round(value * 100)} %`);
const signedPoints = (value) => (value === null || value === undefined ? '–' : `${value >= 0 ? '+' : '−'}${Math.abs(Math.round(value * 100))}`);

// Kurze Zusammenfassung als Text (Konsole und zusammenfassung.txt).
export function formatSummary(result, { steps = [0, 5, 10, 13, 15, 20, 25, 30, 34, 40], minSessions = 5 } = {}) {
  const { datas, curves, variants, counts } = result;
  const lines = [];
  const mains = datas.map((data) => data.main.length);
  lines.push('Auswertung der Kontrollkarten (Messkonzept: docs/messkonzept.md)');
  lines.push('');
  lines.push(`Sitzungen: ${datas.length}, davon mit bewerteten Kontrollkarten: ${datas.filter((data) => data.checks.some((check) => isTasteSignal(check.response))).length}`);
  if (mains.length > 0) lines.push(`Karten der normalen Auswahl pro Person: Median ${median(mains)} (${Math.min(...mains)} bis ${Math.max(...mains)})`);
  lines.push(
    `Kontrollkarten: ${counts.answered} von ${counts.drawn} beantwortet; Mag ich ${counts[LIKE]}, Mag ich sehr ${counts[PREFER]}, Mag ich nicht ${counts[DISLIKE]}, Kenne ich nicht ${counts[UNFAMILIAR]}, Vertrage ich nicht ${counts[INTOLERANT]}`
  );
  for (const { selection, sessions, curve, firstSufficientK: first } of curves) {
    lines.push('');
    lines.push(`Lernkurve, ${selection === 'fixed' ? 'feste Reihenfolge' : 'adaptive Auswahl'} (${sessions} Sitzungen)`);
    lines.push('   k  Pers.  Abdeckung  Trefferquote [95-%-KI]  Vollständigk.  immer Mag ich  andere Pers.  Diff. zu andere [KI]');
    for (const row of curve.filter((entry) => steps.includes(entry.k) || entry.k === curve.at(-1)?.k)) {
      lines.push(
        [
          String(row.k).padStart(4),
          String(row.sessions).padStart(6),
          percent(row.coverage).padStart(11),
          `${percent(row.accuracy)} [${percent(row.accuracyLow)}–${percent(row.accuracyHigh)}]`.padStart(23),
          percent(row.completeness).padStart(14),
          percent(row.baselineMajority).padStart(14),
          percent(row.baselineOthers).padStart(13),
          `${signedPoints(row.diffOthers)} [${signedPoints(row.diffOthersLow)} bis ${signedPoints(row.diffOthersHigh)}]`.padStart(22),
        ].join('')
      );
    }
    lines.push(
      first === null
        ? `Kriterium (Vorschlag, mind. ${minSessions} Personen): noch bei keinem k erfüllt.`
        : `Kriterium (Vorschlag, mind. ${minSessions} Personen): ab k = ${first} sicher besser als beide Vergleichswerte.`
    );
  }
  lines.push('');
  lines.push('Annahmen im Vergleich (alle Antworten der normalen Auswahl):');
  for (const variant of variants) {
    lines.push(`  ${variant.label.padEnd(40)} ${percent(variant.accuracy)} [${percent(variant.accuracyLow)}–${percent(variant.accuracyHigh)}], Abdeckung ${percent(variant.coverage)}`);
  }
  lines.push('');
  lines.push('Trefferquote: richtige Richtung (mag / mag nicht) pro bewerteter Kontrollkarte; ohne Vermutung zählt als falsch.');
  lines.push('Vollständigkeit sagt nichts über die Genauigkeit: Sie zählt nur, zu wie vielen Karten es eine Antwort oder Vermutung gibt.');
  return `${lines.join('\n')}\n`;
}
