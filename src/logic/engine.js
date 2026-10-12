// Engine des Prototyps. Die Oberfläche kennt nur die exportierten Funktionen.
//
// Event-Log als einzige Quelle der Wahrheit (A8): Der Zustand einer Runde wird immer aus der
// Liste der Antwort-Ereignisse abgeleitet (replay). Rückgängig ist ein eigenes Ereignis (UNDO),
// nichts wird gelöscht. So laufen Oberfläche, Profil und Protokoll nie auseinander, und jedes
// Profil lässt sich aus dem exportierten Protokoll nachrechnen.
//
// Alle Funktionen sind rein (kein Zufall, keine Uhrzeit).

import { DISLIKE, INTOLERANT, LIKE, PREFER, RESPONSE_SEMANTICS, RESPONSES, UNDO, UNFAMILIAR, isTasteSignal } from './answers.js';
import { annotateCard, buildExclusions, isVisible } from './filter.js';
import { SOURCE_SWIPE } from './stage0.js';

export const RULE_VERSION = 'demo-0.2';

// Antwort-Ereignis (so wird es auch protokolliert, siehe logging/logger.js):
// { cardId, stage, parentId, positionInRound, response, timestamp, responseTimeMs,
//   inputMethod, selectionReason, excludedCardIds? }
// excludedCardIds nur bei INTOLERANT: welche Karten künftig ausgeschlossen sind
// (die Karte selbst oder eine Auswahl ihrer Nachkommen).

// Spielt die Ereignisse ab. UNDO nimmt die jeweils letzte noch gültige Antwort zurück.
export function replay(events) {
  const active = [];
  for (const event of events) {
    if (event.response === UNDO) {
      active.pop();
      continue;
    }
    if (!RESPONSES.includes(event.response)) continue;
    if (active.some((earlier) => earlier.cardId === event.cardId)) continue;
    active.push(event);
  }

  const answers = {};
  const sequence = [];
  const swipeExclusions = [];
  for (const event of active) {
    answers[event.cardId] = event.response;
    sequence.push(event.cardId);
    if (event.response === INTOLERANT) {
      const ids = event.excludedCardIds?.length ? event.excludedCardIds : [event.cardId];
      for (const id of ids) swipeExclusions.push({ type: 'card', value: id, source: SOURCE_SWIPE, origin: event.cardId });
    }
  }
  return { answers, sequence, swipeExclusions, lastEvent: active.at(-1) ?? null };
}

// Gesamter Zustand der Runde aus Katalog, Onboarding und Ereignissen.
// onboarding: Ergebnis von deriveOnboarding() (diet, exclusions, cardLabels, …).
export function deriveRoundState({ index, onboarding, diets, events = [] }) {
  const played = replay(events);
  const entries = [...(onboarding?.exclusions ?? []), ...played.swipeExclusions];
  const exclusions = buildExclusions(entries, { diet: onboarding?.diet ?? null, diets, index });
  return { index, onboarding, entries, exclusions, cardLabels: onboarding?.cardLabels ?? {}, ...played };
}

function answeredCount(state) {
  return state.sequence.filter((id) => RESPONSE_SEMANTICS[state.answers[id]]?.countsTowardLimit).length;
}

// Welche Karten als Nächstes gezeigt werden.
//
// TODO: Adaptive Logik folgt – Eigenleistung Team.
// Aktuell bewusst nur: Stufe-1-Karten in fester Katalogreihenfolge, die nach den harten
// Ausschlüssen sichtbar und noch nicht beantwortet sind, begrenzt auf das Rundenlimit.
// Nicht umgesetzt (A2): Auswahl Stufe 1 → 2 → 3, Nachtesten von Ausnahmen nach DISLIKE,
// Unterkarte nach UNFAMILIAR, Favoritensuche nach PREFER.
export function selectNextCards(state, config) {
  const remaining = config.roundCardLimit - answeredCount(state);
  if (remaining <= 0) return [];
  return state.index.cards
    .filter((card) => card.stage === 1 && !(card.id in state.answers) && isVisible(card, state.index, state.exclusions))
    .slice(0, remaining);
}

export function selectionReason() {
  return 'stage1_fixed_order';
}

// Karte für die Anzeige: Familien zeigen nur erlaubte Beispiele und Hinweise wie „Ohne Haselnüsse“.
export function presentCard(state, card) {
  return annotateCard(card, state.index, state.exclusions, state.cardLabels);
}

export function nextCard(state, config) {
  const card = selectNextCards(state, config)[0];
  return card ? presentCard(state, card) : null;
}

export function isRoundComplete(state, config) {
  return selectNextCards(state, config).length === 0;
}

export function progress(state, config) {
  const answered = answeredCount(state);
  return { answered, total: answered + selectNextCards(state, config).length };
}

// Stufe-1-Karten, die nach Stufe 0 überhaupt in Frage kommen (für die Vorschau vor dem Start).
export function eligibleFamilies(state) {
  return state.index.cards.filter((card) => card.stage === 1 && isVisible(card, state.index, state.exclusions));
}

// Profil, wie es am Ende angezeigt (und protokolliert) wird.
// Nur Geschmackssignale (DISLIKE, LIKE, PREFER) erscheinen als Geschmack.
// UNFAMILIAR und UNRATED sind keine Bewertung; INTOLERANT ist ein Ausschluss, kein Geschmack.
export function buildProfile(state) {
  const groups = { [PREFER]: [], [LIKE]: [], [DISLIKE]: [], [UNFAMILIAR]: [] };
  const intolerant = [];
  for (const id of state.sequence) {
    const response = state.answers[id];
    if (isTasteSignal(response) || response === UNFAMILIAR) groups[response].push(id);
    else if (response === INTOLERANT) intolerant.push(id);
  }
  const unrated = state.index.cards
    .filter((card) => card.stage === 1 && !(card.id in state.answers) && isVisible(card, state.index, state.exclusions))
    .map((card) => card.id);
  return {
    ruleVersion: RULE_VERSION,
    taste: { [PREFER]: groups[PREFER], [LIKE]: groups[LIKE], [DISLIKE]: groups[DISLIKE] },
    unfamiliar: groups[UNFAMILIAR],
    unrated,
    intolerant,
    exclusions: state.entries.map(({ type, value, source, origin, label }) => ({ type, value, source, origin: origin ?? null, label: label ?? null })),
  };
}

// Alle Antworten, die in einen Geschmacksscore eingehen dürfen. INTOLERANT ist nie dabei.
export function tasteSignals(state) {
  return state.sequence.filter((id) => isTasteSignal(state.answers[id])).map((id) => ({ cardId: id, response: state.answers[id] }));
}
