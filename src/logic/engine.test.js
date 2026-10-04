import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAnswer, createRound, isRoundComplete, nextCard, summarize } from './engine.js';
import { DISLIKE, LIKE, UNRATED } from './answers.js';

const cards = [
  { id: 'F01', level: 1, title: 'Fleisch und Geflügel' },
  { id: 'F02', level: 1, title: 'Fisch und Meeresfrüchte' },
  { id: 'F01.1', level: 2, parent: 'F01', title: 'Geflügel' },
];

test('Eine Runde enthält nur Karten der gewählten Stufe', () => {
  assert.equal(createRound(cards).cards.length, 2);
});

test('Antworten werden gespeichert, offene Karten bleiben UNRATED', () => {
  let state = createRound(cards);
  state = applyAnswer(state, nextCard(state).id, LIKE);
  assert.equal(nextCard(state).id, 'F02');
  const groups = summarize(state);
  assert.deepEqual(groups[LIKE].map((card) => card.id), ['F01']);
  assert.deepEqual(groups[UNRATED].map((card) => card.id), ['F02']);
});

test('Die Runde ist nach der letzten Karte abgeschlossen', () => {
  let state = createRound(cards);
  state = applyAnswer(state, 'F01', LIKE);
  state = applyAnswer(state, 'F02', DISLIKE);
  assert.equal(isRoundComplete(state), true);
});

test('Eine Karte wird nicht doppelt beantwortet', () => {
  const state = applyAnswer(createRound(cards), 'F01', LIKE);
  assert.equal(applyAnswer(state, 'F01', DISLIKE), state);
});
