// Engine des Prototyps. Die Oberfläche kennt nur die exportierten Funktionen.
//
// Event-Log als einzige Quelle der Wahrheit (A8): Der Zustand einer Runde wird immer aus der
// Liste der Ereignisse abgeleitet (replay). Rückgängig ist ein eigenes Ereignis (UNDO),
// nichts wird gelöscht. So laufen Oberfläche, Profil und Protokoll nie auseinander, und jedes
// Profil lässt sich aus dem exportierten Protokoll nachrechnen.
// Profiländerungen (RATING_CHANGED, EXCLUSION_ADDED, EXCLUSION_REMOVED, DIET_CHANGED, siehe events.js)
// sind weitere Ereignisse im selben Log. Sie überschreiben nie die ursprüngliche Swipe-Antwort.
//
// Alle Funktionen sind rein (kein Zufall, keine Uhrzeit).

import { cardLimit, DISH_ROUND_END_AFTER, MAX_ROUNDS, PREFERENCE_MODEL } from '../config.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, RESPONSE_SEMANTICS, RESPONSES, UNDO, UNFAMILIAR, isTasteSignal } from './answers.js';
import { ANSWER, DIET_CHANGED, EXCLUSION_ADDED, EXCLUSION_REMOVED, HOLDOUT_DRAWN, RATING_CHANGED, SOURCE_PROFILE, eventType, isProfileEvent } from './events.js';
import { annotateCard, buildExclusions, displayCardTitle, isVisible } from './filter.js';
import { directScore, predictedRating, predictScores } from './preferences.js';
import { sectionOf } from './profile.js';
import { currentRating, isDone, rankedStageCards, REASONS } from './selection.js';
import { SOURCE_SWIPE } from './stage0.js';

// demo-0.3: adaptive Kartenauswahl, Kontrollkarten und Präferenzmodell (Version 0.7)
// demo-0.4: Regeln nach nurec v0.2, Kap. 6 und 11 (Ausnahme, Kontrastpaar, Klärung auch auf Stufe 2, Stufe 3, Gerichte)
// demo-0.5: je Runde eine Ebene, Gerichte in Runde 4, maximal 15 Karten; Kontrollen in Runde 2.
// demo-0.6: Dozentenfeedback 19.10.2026: negative Gruppe ist kein Ausschluss (NEGATIVE_GROUP_POLICY 'last',
//           Quote Runde 3), Gesten und Begriffe je Runde (r1scale), Restriktionen mit Fleischarten.
// demo-0.7: Teamentscheid 28.10.2026: Runde 4 ohne Kartenlimit mit allen passenden Gerichten (Affinität aus der
//           nächsten direkten Bewertung je Zutat, keine Gerichte mit mehr Abneigung als Zuneigung), Abschluss der
//           Runde durch die Person (DISH_ROUND_END_AFTER). Runden 1 bis 3 unverändert.
export const RULE_VERSION = 'demo-0.7';

// Antwort-Ereignis (so wird es auch protokolliert, siehe logging/logger.js):
// { cardId, stage, parentId, round, positionInRound, response, timestamp, responseTimeMs,
//   inputMethod, selectionReason, excludedCardIds? }
// excludedCardIds nur bei INTOLERANT: welche Karten künftig ausgeschlossen sind
// (die Karte selbst oder eine Auswahl ihrer Nachkommen).
// round: Nummer der Runde (1, 2, …). Ereignisse ohne das Feld stammen aus Runde 1.

export function roundOfEvent(event) {
  const round = event?.round ?? 1;
  return typeof round === 'string' && round.startsWith('G') ? 4 : round;
}

function swipeEntries(event) {
  const ids = event.excludedCardIds?.length ? event.excludedCardIds : [event.cardId];
  return ids.map((id) => ({ type: 'card', value: id, source: SOURCE_SWIPE, origin: event.cardId }));
}

// Spielt die Antworten beim Wischen ab. UNDO nimmt die jeweils letzte noch gültige Antwort zurück.
// answeredAt: Position der gültigen Antwort im Log (für spätere Profiländerungen an dieser Karte).
export function replay(events) {
  const active = [];
  events.forEach((event, at) => {
    if (eventType(event) !== ANSWER) return;
    if (event.response === UNDO) {
      active.pop();
      return;
    }
    if (!RESPONSES.includes(event.response)) return;
    if (active.some((earlier) => earlier.event.cardId === event.cardId)) return;
    active.push({ event, at });
  });

  const answers = {};
  const answeredAt = {};
  const answeredInRound = {};
  const sequence = [];
  const swipeExclusions = [];
  for (const { event, at } of active) {
    answers[event.cardId] = event.response;
    answeredAt[event.cardId] = at;
    answeredInRound[event.cardId] = roundOfEvent(event);
    sequence.push(event.cardId);
    if (event.response === INTOLERANT) swipeExclusions.push(...swipeEntries(event));
  }
  return { answers, answeredAt, answeredInRound, sequence, swipeExclusions, lastEvent: active.at(-1)?.event ?? null };
}

function matchesRemoval(entry, removal, section) {
  return entry.type === removal.type && entry.value === removal.value && (!section || sectionOf(entry) === section);
}

// Ausschlüsse, Ernährungsweise und Bewertungen in zeitlicher Reihenfolge: Grundlage sind die Angaben
// aus dem Onboarding, dann folgen „Vertrage ich nicht“ beim Wischen und Änderungen im Profil.
// Ein entfernter Ausschluss fehlt danach einfach in den Einträgen; ob eine Karte wieder erlaubt ist,
// entscheidet wie immer isAllowed() (keine Sonderlogik).
function applyEvents(events, played, onboarding) {
  let entries = [...(onboarding?.exclusions ?? [])];
  let diet = onboarding?.diet ?? null;
  const ratingChanges = {};
  events.forEach((event, at) => {
    const type = eventType(event);
    if (type === ANSWER) {
      if (event.response === INTOLERANT && played.answeredAt[event.cardId] === at) entries.push(...swipeEntries(event));
      return;
    }
    if (!isProfileEvent(event)) return;
    if (type === EXCLUSION_ADDED) {
      for (const exclusion of event.exclusions ?? []) {
        const entry = { ...exclusion, source: SOURCE_PROFILE, section: event.section };
        if (!entries.some((existing) => matchesRemoval(existing, entry, event.section))) entries.push(entry);
      }
    } else if (type === EXCLUSION_REMOVED) {
      entries = entries.filter((entry) => !(event.exclusions ?? []).some((removal) => matchesRemoval(entry, removal, event.section)));
    } else if (type === DIET_CHANGED) {
      diet = event.diet ?? null;
    } else if (type === RATING_CHANGED) {
      const fromPrediction = Boolean(event.fromPrediction) || Boolean(ratingChanges[event.cardId]?.fromPrediction);
      ratingChanges[event.cardId] = { rating: event.rating ?? null, at, fromPrediction };
    }
  });

  // Letzte direkte Antwort pro Karte: die Antwort beim Wischen oder eine spätere Änderung im Profil.
  // Wird die Antwort beim Wischen rückgängig gemacht, gelten auch frühere Änderungen nicht mehr.
  const ratings = {};
  for (const cardId of played.sequence) {
    const change = ratingChanges[cardId];
    ratings[cardId] = change && change.at > played.answeredAt[cardId] ? change.rating : played.answers[cardId];
  }
  // Vermutungen, die jemand im Profil direkt bewertet hat (fromPrediction): Karten ohne Antwort beim Wischen.
  const profileRated = [];
  for (const [cardId, change] of Object.entries(ratingChanges)) {
    if (cardId in played.answers || !change.fromPrediction) continue;
    ratings[cardId] = change.rating;
    profileRated.push(cardId);
  }
  return { entries, diet, ratings, profileRated };
}

// Kontrollkarten: die Karten des letzten HOLDOUT_DRAWN-Ereignisses.
function holdoutOf(events) {
  let cardIds = [];
  for (const event of events) if (eventType(event) === HOLDOUT_DRAWN) cardIds = [...(event.cardIds ?? [])];
  return cardIds;
}

// Gesamter Zustand aus Katalog, Onboarding und Ereignissen.
// onboarding: Ergebnis von deriveOnboarding() (diet, exclusions, cardLabels, …).
// round: laufende Runde. roundSequence sind die Karten dieser Runde, lastEvent ist die letzte Antwort
// dieser Runde (Rückgängig wirkt nie in eine abgeschlossene Runde hinein).
// holdout: Kontrollkarten (Messkonzept). profileRated: im Profil direkt bewertete Vermutungen.
export function deriveRoundState({ index, onboarding, diets, events = [], round = 1 }) {
  const played = replay(events);
  const { entries, diet, ratings, profileRated } = applyEvents(events, played, onboarding);
  const exclusions = buildExclusions(entries, { diet, diets, index });
  // Alte Sitzungen können mehrere Ebenen in derselben Runde enthalten. Ihre Antworten bleiben
  // erhalten, zählen aber nur dann zum neuen Rundenlimit, wenn sie zur aktuellen Ebene gehören.
  const roundSequence = played.sequence.filter((id) => played.answeredInRound[id] === round && index.get(id)?.stage === round);
  const lastEvent = roundOfEvent(played.lastEvent) === round && index.get(played.lastEvent?.cardId)?.stage === round ? played.lastEvent : null;
  return {
    index,
    onboarding,
    entries,
    exclusions,
    diet,
    ratings,
    profileRated,
    holdout: holdoutOf(events),
    cardLabels: onboarding?.cardLabels ?? {},
    ...played,
    round,
    roundSequence,
    lastEvent,
  };
}

function answeredCount(state) {
  return (state.roundSequence ?? state.sequence).filter((id) => RESPONSE_SEMANTICS[state.answers[id]]?.countsTowardLimit).length;
}

// Kontrollkarten, die noch gezeigt werden: sichtbar (Ausschlüsse können sich im Profil ändern) und offen.
export function openHoldout(state) {
  return (state.holdout ?? [])
    .map((id) => state.index.get(id))
    .filter((card) => card && !isDone(state, card.id) && isVisible(card, state.index, state.exclusions));
}

// Gerichte bilden Runde 4. Das alte G-Präfix bleibt nur zum Lesen gespeicherter Protokolle erhalten.
export const DISH_ROUND_PREFIX = 'G';

export function isDishRound(round) {
  return round === 4 || (typeof round === 'string' && round.startsWith(DISH_ROUND_PREFIX));
}

export function dishRoundId(number) {
  return `${DISH_ROUND_PREFIX}${number}`;
}

// Nächste direkte Geschmacksantwort auf der Karte selbst oder auf einer Karte darüber, als Modellwert
// (Mag ich nicht −1, Mag ich +1, Mag ich sehr +2). null, wenn es auf dem Weg nach oben keine Antwort gibt.
function nearestTasteScore(state, id) {
  for (let card = state.index.get(id); card; card = state.index.get(card.parentId)) {
    const score = directScore(currentRating(state, card.id));
    if (score !== null) return score;
  }
  return null;
}

// Zutatenaffinität eines Gerichts (Teamentscheid 28.10.2026): Mittel über die verknüpften Zutatenkarten (ingredients)
// aus der nächsten direkten Bewertung je Zutat, ohne Abschwächung je Stufe, damit Gerichte mit Gruppen- und mit
// Sortenzutaten gleich behandelt werden; eine Zutat ohne Bewertung zählt 0. Vermutungen (preferences.js) bleiben
// davon unberührt; die Antwort auf ein Gericht geht nie auf Zutaten über.
export function dishAffinity(state, card) {
  const scores = (card.ingredients ?? []).map((id) => nearestTasteScore(state, id) ?? 0);
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
}

// Gerichte, die zur Person passen und noch bewertet werden können: sichtbar (Ausschlüsse wirken auch hier),
// noch offen und mit Affinität von mindestens 0 (nicht mehr Abneigung als Zuneigung unter den Zutaten).
// Sortiert nach Affinität, bei Gleichstand in Katalogreihenfolge. Es gibt kein Kartenlimit und keine Füllkarten.
export function openDishes(state) {
  return state.index.cards
    .filter((card) => card.stage === 4 && !isDone(state, card.id) && isVisible(card, state.index, state.exclusions))
    .map((card, position) => ({ card, position, score: dishAffinity(state, card) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || a.position - b.position)
    .map(({ card }) => card);
}

// Runde 4: Hat die Person genug Gerichte gesehen, um die Runde beenden zu dürfen (DISH_ROUND_END_AFTER)?
export function dishesEnoughSeen(state) {
  return isDishRound(state.round) && answeredCount(state) >= DISH_ROUND_END_AFTER;
}

// Welche Karten in dieser Runde noch kommen.
//
// Auswahl: src/logic/selection.js (config.selection: 'adaptive' oder 'fixed'; ohne Angabe 'fixed').
// Runden 1 bis 3 bleiben auf ihrer Ebene und haben höchstens 15 Karten. Kontrollkarten teilen das Budget
// ihrer Ebene (normalerweise Untergruppen in Runde 2). Runde 4 zeigt alle passenden Gerichte ohne Limit;
// die Person beendet sie selbst (RoundScreen, DISH_ROUND_END_AFTER).
export function selectNextCards(state, config = {}) {
  if (!Number.isInteger(state.round) || state.round < 1 || state.round > MAX_ROUNDS) return [];
  if (isDishRound(state.round)) return openDishes(state);
  const remaining = cardLimit(config) - answeredCount(state);
  if (remaining <= 0) return [];
  const checks = openHoldout(state).filter((card) => card.stage === state.round);
  const main = rankedStageCards(state, config.selection)
    .slice(0, Math.max(0, remaining - checks.length))
    .map((entry) => entry.card);
  return [...main, ...checks].slice(0, remaining);
}

// Gibt es nach dieser Runde noch eine erlaubte weitere Runde mit offenen Karten?
// nextRoundCards: die Karten der nächsten Runde (für den Ausblick im Abschluss).
export function hasMoreCards(state, config = {}) {
  return nextRoundNumber(state, config) !== null;
}

function inRound(state, round) {
  const roundSequence = state.sequence.filter((id) => state.answeredInRound[id] === round && state.index.get(id)?.stage === round);
  return { ...state, round, roundSequence, lastEvent: null };
}

export function nextRoundNumber(state, config = {}) {
  if (!Number.isInteger(state.round)) return null;
  for (let round = state.round + 1; round <= MAX_ROUNDS; round += 1) {
    if (selectNextCards(inRound(state, round), config).length > 0) return round;
  }
  return null;
}

export function nextRoundCards(state, config) {
  const round = nextRoundNumber(state, config);
  return round === null ? [] : selectNextCards(inRound(state, round), config);
}

// Warum eine Karte gezeigt wird (Feld selectionReason im Protokoll, Gründe in selection.js).
export function selectionReason(state, card, config = {}) {
  if (!card) return null;
  if ((state.holdout ?? []).includes(card.id)) return REASONS.HOLDOUT;
  if (card.stage === 4) return REASONS.DISH;
  const entry = rankedStageCards(state, config.selection).find((ranked) => ranked.card.id === card.id);
  return entry?.reason ?? (card.stage === 1 ? REASONS.FIXED_STAGE1 : card.stage === 2 ? REASONS.FIXED_STAGE2 : REASONS.FIXED_STAGE3);
}

// Kontrollkarte oder normale Auswahl (Feld phase im Protokoll).
export function isHoldoutCard(state, cardId) {
  return (state.holdout ?? []).includes(cardId);
}

// Karte für die Anzeige: Familien zeigen nur erlaubte Beispiele und Hinweise wie „Ohne Haselnüsse“.
// group: bei Untergruppen und konkreten Lebensmitteln der Name darüber, an die Ausschlüsse angepasst
// (z. B. nur „Fisch“, wenn Meeresfrüchte ausgeschlossen sind), bei Gerichten „Gericht“.
export function presentCard(state, card) {
  const presented = annotateCard(card, state.index, state.exclusions, state.cardLabels);
  if (card.stage === 4) return { ...presented, group: null, dish: true };
  const parent = card.stage >= 2 ? state.index.get(card.parentId) : null;
  return parent ? { ...presented, group: displayCardTitle(parent, state.index, state.exclusions) } : presented;
}

export function nextCard(state, config) {
  const card = selectNextCards(state, config)[0];
  return card ? presentCard(state, card) : null;
}

export function isRoundComplete(state, config) {
  return selectNextCards(state, config).length === 0;
}

// Status einer Runde (Dozentenfeedback 19.10.2026, Korrektur nach AP1). state: deriveRoundState für diese Runde.
//   open        noch keine Karte beantwortet
//   started     begonnen, Karten offen (auch nach „Runde beenden“; das vorzeitige Ende steht als QUESTION_ABORTED im Log)
//   completed   Kartenlimit erreicht oder keine Karte mehr, auch wenn die Runde vorher beendet und fortgesetzt wurde;
//               Runde 4 (Gerichte) ausserdem ab DISH_ROUND_END_AFTER bewerteten Gerichten
//   unavailable keine Karte beantwortet und keine erlaubte Karte übrig (z. B. nach den Ausschlüssen)
export const ROUND_STATUS = { OPEN: 'open', STARTED: 'started', COMPLETED: 'completed', UNAVAILABLE: 'unavailable' };

export function roundStatus(state, config) {
  const complete = isRoundComplete(state, config) || dishesEnoughSeen(state);
  if (state.roundSequence.length === 0) return complete ? ROUND_STATUS.UNAVAILABLE : ROUND_STATUS.OPEN;
  return complete ? ROUND_STATUS.COMPLETED : ROUND_STATUS.STARTED;
}

// Fortsetzen einer vorzeitig beendeten Runde: nur solange in einer späteren Runde noch keine Karte beantwortet ist.
// Danach beruht die Auswahl der späteren Runde schon auf dem Stand bei Rundenende.
// Runde 4 (Gerichte) lässt sich fortsetzen, solange passende Gerichte offen sind: Keine spätere Runde hängt davon ab.
export function canResumeRound(state, config) {
  if (isDishRound(state.round)) return state.roundSequence.length > 0 && !isRoundComplete(state, config);
  if (roundStatus(state, config) !== ROUND_STATUS.STARTED) return false;
  return !state.sequence.some((id) => state.answeredInRound[id] > state.round);
}

// Fortschritt der Runde. total ist in Runde 1 bis 3 höchstens das Rundenlimit (ROUND_CARD_LIMIT, config.roundCardLimit)
// und kleiner, wenn nach den Ausschlüssen weniger Karten übrig sind; in Runde 4 die Zahl der passenden Gerichte.
// percent wird daraus abgeleitet.
export function progress(state, config) {
  const answered = answeredCount(state);
  const total = answered + selectNextCards(state, config).length;
  return { answered, total, percent: total === 0 ? 100 : Math.round((answered / total) * 100) };
}

// Stufe-1-Karten, die nach Stufe 0 überhaupt in Frage kommen (für die Vorschau vor dem Start).
export function eligibleFamilies(state) {
  return state.index.cards.filter((card) => card.stage === 1 && isVisible(card, state.index, state.exclusions));
}

// Karten mit direkter Bewertung in der Reihenfolge der Antworten: zuerst beim Wischen, dann im Profil
// bestätigte Vermutungen.
function ratedIds(state) {
  return [...state.sequence, ...(state.profileRated ?? [])];
}

// Geschmacksprofil für „Mein Profil“: gruppiert nur nach der letzten direkten Antwort pro Karte
// (beim Wischen oder später im Profil geändert). Reine Funktion, ohne Prozentwerte und ohne Vermutungen
// (die stehen getrennt in derivedEntries).
export function computeProfile(state) {
  const groups = { [PREFER]: [], [LIKE]: [], [DISLIKE]: [], [UNFAMILIAR]: [] };
  const intolerant = [];
  const removed = [];
  for (const id of ratedIds(state)) {
    const rating = state.ratings ? state.ratings[id] : state.answers[id];
    if (rating === null) {
      if (id in state.answers) removed.push(id);
    } else if (rating in groups) groups[rating].push(id);
    else if (rating === INTOLERANT) intolerant.push(id);
  }
  return { groups, intolerant, removed, answered: state.sequence.length };
}

// Vermutungen der App für „Mein Profil“ (preferences.js), getrennt von den direkten Bewertungen:
// nur Untergruppen und Sorten, die sichtbar und noch nicht bewertet sind. Kontrollkarten erscheinen erst,
// wenn sie beantwortet sind (sonst könnte die Vermutung die Antwort beeinflussen).
// Jeder Eintrag: { cardId, score, rating (LIKE | DISLIKE), basisId, basisRating }, stärkste Vermutung zuerst.
export function derivedEntries(state, model = PREFERENCE_MODEL) {
  const ratings = state.ratings ?? state.answers;
  const predictions = predictScores(state.index, ratings, model);
  const holdout = new Set(state.holdout ?? []);
  const order = new Map(state.index.cards.map((card, position) => [card.id, position]));
  return state.index.cards
    .filter((card) => card.stage > 1 && !isDone(state, card.id) && !holdout.has(card.id) && isVisible(card, state.index, state.exclusions))
    .map((card) => ({ card, prediction: predictions.get(card.id) }))
    .filter(({ prediction }) => prediction && !prediction.direct && predictedRating(prediction.score))
    .map(({ card, prediction }) => ({
      cardId: card.id,
      score: prediction.score,
      rating: predictedRating(prediction.score),
      basisId: prediction.basisId,
      basisRating: ratings[prediction.basisId] ?? null,
    }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score) || order.get(a.cardId) - order.get(b.cardId));
}

// Profil, wie es am Ende angezeigt (und protokolliert) wird.
// Nur Geschmackssignale (DISLIKE, LIKE, PREFER) erscheinen als Geschmack.
// UNFAMILIAR und UNRATED sind keine Bewertung; INTOLERANT ist ein Ausschluss, kein Geschmack.
// predicted: Vermutungen (getrennt, nie als Geschmack gezählt), für die Auswertung.
export function buildProfile(state) {
  const { groups, intolerant, removed } = computeProfile(state);
  const unrated = state.index.cards
    .filter((card) => card.stage === 1 && !(card.id in state.answers) && isVisible(card, state.index, state.exclusions))
    .map((card) => card.id);
  return {
    ruleVersion: RULE_VERSION,
    taste: { [PREFER]: groups[PREFER], [LIKE]: groups[LIKE], [DISLIKE]: groups[DISLIKE] },
    unfamiliar: groups[UNFAMILIAR],
    unrated,
    intolerant,
    removed,
    predicted: derivedEntries(state).map(({ cardId, score, basisId }) => ({ cardId, score, basisId })),
    diet: state.diet ?? null,
    exclusions: state.entries.map(({ type, value, source, origin, label }) => ({ type, value, source, origin: origin ?? null, label: label ?? null })),
  };
}

// ---------- „Vertrage ich nicht“ auf einer Familienkarte (A4) ----------

function visibleLeaves(state, card) {
  const children = state.index.childrenOf(card.id).filter((child) => isVisible(child, state.index, state.exclusions));
  if (children.length === 0) return [card];
  return children.flatMap((child) => visibleLeaves(state, child));
}

// Optionen für die Detailauswahl: direkte Kinder ohne eigene Kinder in einem Abschnitt,
// Kinder mit eigenen Kindern (z. B. Baumnüsse) als eigener Abschnitt mit ihren Einträgen.
// Null, wenn die Karte keine sichtbaren Kinder hat: Dann gilt der Ausschluss direkt für die Karte.
export function intoleranceOptions(state, card) {
  const children = state.index.childrenOf(card.id).filter((child) => isVisible(child, state.index, state.exclusions));
  if (children.length === 0) return null;
  const direct = [];
  const sections = [];
  for (const child of children) {
    const leaves = visibleLeaves(state, child);
    if (leaves.length === 1 && leaves[0].id === child.id) direct.push(child);
    else sections.push({ id: child.id, label: displayCardTitle(child, state.index, state.exclusions), options: leaves.map((leaf) => ({ id: leaf.id, label: leaf.title })) });
  }
  const directSection = direct.length > 0 ? [{ id: `${card.id}-direct`, options: direct.map((leaf) => ({ id: leaf.id, label: leaf.title })) }] : [];
  return { sections: [...directSection, ...sections] };
}

// Fasst die gewählten Einträge zusammen: alles gewählt → die Familie selbst,
// ein ganzer Abschnitt gewählt → die Untergruppe, sonst die einzelnen Einträge.
export function collapseIntolerance(state, card, selectedIds) {
  const options = intoleranceOptions(state, card);
  if (!options) return [card.id];
  const chosen = new Set(selectedIds);
  const all = options.sections.flatMap((section) => section.options.map((option) => option.id));
  if (all.length > 0 && all.every((id) => chosen.has(id))) return [card.id];
  const out = [];
  for (const section of options.sections) {
    const ids = section.options.map((option) => option.id);
    const isGroup = !section.id.endsWith('-direct');
    if (isGroup && ids.length > 1 && ids.every((id) => chosen.has(id))) out.push(section.id);
    else out.push(...ids.filter((id) => chosen.has(id)));
  }
  return out;
}

// Alle Antworten, die in einen Geschmacksscore eingehen dürfen (letzte direkte Antwort pro Karte).
// INTOLERANT ist nie dabei.
export function tasteSignals(state) {
  const current = (id) => (state.ratings ? state.ratings[id] : state.answers[id]);
  return ratedIds(state)
    .filter((id) => isTasteSignal(current(id)))
    .map((id) => ({ cardId: id, response: current(id) }));
}
