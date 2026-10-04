// Austauschbare Logik. Die Oberfläche kennt nur die exportierten Funktionen.
//
// Version demo-0.1: feste Reihenfolge der Stufe-1-Karten, keine Vertiefung.
// In Phase 2 ersetzt die adaptive Logik nextCard() und applyAnswer(),
// ohne dass die Oberfläche angepasst werden muss. Alle Funktionen sind rein
// (kein Zufall, keine Uhrzeit), damit sich ein Profil aus dem Protokoll
// jederzeit nachrechnen lässt.

import { ANSWER_ORDER, UNRATED } from './answers.js';

export const RULE_VERSION = 'demo-0.1';

export function createRound(catalogCards, level = 1) {
  const cards = catalogCards.filter((card) => card.level === level);
  return { level, cards, answers: {}, sequence: [] };
}

export function nextCard(state) {
  return state.cards.find((card) => !(card.id in state.answers)) ?? null;
}

// Begründung, warum eine Karte gezeigt wird (nurec v0.2, Kap. 6: Auswahlgrund protokollieren).
export function selectionReason(state, card) {
  return 'feste Reihenfolge (Demo)';
}

export function applyAnswer(state, cardId, answer) {
  if (cardId in state.answers) return state;
  return {
    ...state,
    answers: { ...state.answers, [cardId]: answer },
    sequence: [...state.sequence, cardId],
  };
}

export function isRoundComplete(state) {
  return nextCard(state) === null;
}

export function progress(state) {
  return { answered: state.sequence.length, total: state.cards.length };
}

// Gruppiert die Karten nach Antwort. Nicht beantwortete Karten bleiben UNRATED.
export function summarize(state) {
  const groups = Object.fromEntries([...ANSWER_ORDER, UNRATED].map((key) => [key, []]));
  for (const card of state.cards) {
    groups[state.answers[card.id] ?? UNRATED].push(card);
  }
  return groups;
}
