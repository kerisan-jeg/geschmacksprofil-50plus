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

import { MAX_ROUNDS, PREFERENCE_MODEL } from '../config.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, RESPONSE_SEMANTICS, RESPONSES, UNDO, UNFAMILIAR, isTasteSignal } from './answers.js';
import { ANSWER, DIET_CHANGED, EXCLUSION_ADDED, EXCLUSION_REMOVED, HOLDOUT_DRAWN, RATING_CHANGED, SOURCE_PROFILE, eventType, isProfileEvent } from './events.js';
import { annotateCard, buildExclusions, isVisible } from './filter.js';
import { predictedRating, predictScores } from './preferences.js';
import { sectionOf } from './profile.js';
import { isDone, rankedCards, REASONS } from './selection.js';
import { SOURCE_SWIPE } from './stage0.js';

// demo-0.3: adaptive Kartenauswahl, Kontrollkarten und Präferenzmodell (Version 0.7)
// demo-0.4: Regeln nach nurec v0.2, Kap. 6 und 11 (Ausnahme, Kontrastpaar, Klärung auch auf Stufe 2, Stufe 3, Gerichte)
export const RULE_VERSION = 'demo-0.4';

// Antwort-Ereignis (so wird es auch protokolliert, siehe logging/logger.js):
// { cardId, stage, parentId, round, positionInRound, response, timestamp, responseTimeMs,
//   inputMethod, selectionReason, excludedCardIds? }
// excludedCardIds nur bei INTOLERANT: welche Karten künftig ausgeschlossen sind
// (die Karte selbst oder eine Auswahl ihrer Nachkommen).
// round: Nummer der Runde (1, 2, …). Ereignisse ohne das Feld stammen aus Runde 1.

export function roundOfEvent(event) {
  return event?.round ?? 1;
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
  const roundSequence = played.sequence.filter((id) => played.answeredInRound[id] === round);
  const lastEvent = roundOfEvent(played.lastEvent) === round ? played.lastEvent : null;
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

// Gerichte (Stufe 4, nurec v0.2 Kap. 5): freiwillige eigene Runden mit der Nummer „G1“, „G2“ … Sie zählen nicht zu
// den MAX_ROUNDS Runden der Profilerstellung, haben keine Kontrollkarten und keine Vermutungen.
export const DISH_ROUND_PREFIX = 'G';

export function isDishRound(round) {
  return typeof round === 'string' && round.startsWith(DISH_ROUND_PREFIX);
}

export function dishRoundId(number) {
  return `${DISH_ROUND_PREFIX}${number}`;
}

// Gerichte, die noch bewertet werden können: sichtbar (Ausschlüsse wirken auch hier) und noch offen.
export function openDishes(state) {
  return state.index.cards.filter((card) => card.stage === 4 && !isDone(state, card.id) && isVisible(card, state.index, state.exclusions));
}

// Welche Karten in dieser Runde noch kommen.
//
// Auswahl: src/logic/selection.js (config.selection: 'adaptive' oder 'fixed'; ohne Angabe 'fixed').
// Je Runde höchstens das Kartenlimit, insgesamt höchstens MAX_ROUNDS Runden. Die Kontrollkarten kommen
// immer zuletzt: Die normale Auswahl bekommt nur so viele Plätze, dass bis zum Ende von Runde MAX_ROUNDS
// alle Kontrollkarten Platz haben. Endet die Auswahl früher (keine sinnvolle Karte mehr), folgen sie direkt.
export function selectNextCards(state, config) {
  const remaining = config.roundCardLimit - answeredCount(state);
  if (isDishRound(state.round)) return remaining > 0 ? openDishes(state).slice(0, remaining) : [];
  if (state.round > MAX_ROUNDS) return [];
  if (remaining <= 0) return [];
  const checks = openHoldout(state);
  const slotsLeft = (MAX_ROUNDS - state.round) * config.roundCardLimit + remaining;
  const main = rankedCards(state, config.selection)
    .slice(0, Math.max(0, slotsLeft - checks.length))
    .map((entry) => entry.card);
  return [...main, ...checks].slice(0, remaining);
}

// Gibt es nach dieser Runde noch eine erlaubte weitere Runde mit offenen Karten?
// nextRoundCards: die Karten der nächsten Runde (für den Ausblick im Abschluss).
export function hasMoreCards(state, config = {}) {
  if (isDishRound(state.round)) return false;
  return state.round < MAX_ROUNDS && (rankedCards(state, config.selection).length > 0 || openHoldout(state).length > 0);
}

export function nextRoundCards(state, config) {
  if (!hasMoreCards(state, config)) return [];
  return selectNextCards({ ...state, round: state.round + 1, roundSequence: [], lastEvent: null }, config);
}

// Warum eine Karte gezeigt wird (Feld selectionReason im Protokoll, Gründe in selection.js).
export function selectionReason(state, card, config = {}) {
  if (!card) return null;
  if ((state.holdout ?? []).includes(card.id)) return REASONS.HOLDOUT;
  if (card.stage === 4) return REASONS.DISH;
  const entry = rankedCards(state, config.selection).find((ranked) => ranked.card.id === card.id);
  return entry?.reason ?? (card.stage === 1 ? REASONS.FIXED_STAGE1 : REASONS.FIXED_STAGE2);
}

// Kontrollkarte oder normale Auswahl (Feld phase im Protokoll).
export function isHoldoutCard(state, cardId) {
  return (state.holdout ?? []).includes(cardId);
}

// Karte für die Anzeige: Familien zeigen nur erlaubte Beispiele und Hinweise wie „Ohne Haselnüsse“.
// group: bei Untergruppen und konkreten Lebensmitteln der Name darüber (z. B. „Fleisch und Geflügel“ über „Rind“,
// „Rind“ über „Rindssteak“), bei Gerichten „Gericht“ (dishLabel aus labels.js, siehe RoundScreen).
export function presentCard(state, card) {
  const presented = annotateCard(card, state.index, state.exclusions, state.cardLabels);
  if (card.stage === 4) return { ...presented, group: null, dish: true };
  const parent = card.stage >= 2 ? state.index.get(card.parentId) : null;
  return parent ? { ...presented, group: parent.title } : presented;
}

export function nextCard(state, config) {
  const card = selectNextCards(state, config)[0];
  return card ? presentCard(state, card) : null;
}

export function isRoundComplete(state, config) {
  return selectNextCards(state, config).length === 0;
}

// Fortschritt der Runde. total ist höchstens das Rundenlimit (ROUND_CARD_LIMIT, config.roundCardLimit)
// und kleiner, wenn nach den Ausschlüssen weniger Karten übrig sind. percent wird daraus abgeleitet.
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
    else sections.push({ id: child.id, label: child.title, options: leaves.map((leaf) => ({ id: leaf.id, label: leaf.title })) });
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
