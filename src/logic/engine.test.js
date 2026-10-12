import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexCatalog } from './catalog.js';
import { buildProfile, deriveRoundState, isRoundComplete, nextCard, progress, replay, selectNextCards, tasteSignals } from './engine.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNDO, UNFAMILIAR } from './answers.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const { diets } = read('../data/stage0.json');
const config = { roundCardLimit: 10 };
const noOnboarding = { diet: null, exclusions: [], cardLabels: {} };

const answer = (cardId, response, extra = {}) => ({ cardId, response, ...extra });
const state = (events, onboarding = noOnboarding) => deriveRoundState({ index, onboarding, diets, events });

test('selectNextCards liefert nur Stufe-1-Karten in fester Reihenfolge (Platzhalter)', () => {
  const cards = selectNextCards(state([]), { roundCardLimit: 30 });
  assert.equal(cards.length, 13);
  assert.ok(cards.every((card) => card.stage === 1));
  assert.deepEqual(cards.slice(0, 3).map((card) => card.id), ['F01', 'F02', 'F03']);
});

test('Das Rundenlimit begrenzt die Karten', () => {
  assert.equal(selectNextCards(state([]), config).length, 10);
  const events = ['F01', 'F02', 'F03', 'F04'].map((id) => answer(id, LIKE));
  assert.deepEqual(progress(state(events), { roundCardLimit: 4 }), { answered: 4, total: 4 });
  assert.equal(isRoundComplete(state(events), { roundCardLimit: 4 }), true);
});

test('Antworten werden gespeichert, offene Karten bleiben UNRATED', () => {
  const current = state([answer('F01', PREFER), answer('F02', DISLIKE), answer('F03', UNFAMILIAR)]);
  const profile = buildProfile(current);
  assert.deepEqual(profile.taste.PREFER, ['F01']);
  assert.deepEqual(profile.taste.DISLIKE, ['F02']);
  assert.deepEqual(profile.unfamiliar, ['F03']);
  assert.equal(profile.unrated.length, 10);
  assert.equal(nextCard(current, config).id, 'F04');
});

test('INTOLERANT → harter Ausschluss mit source "swipe", kein Geschmackssignal, zählt fürs Limit', () => {
  const current = state([answer('F03', INTOLERANT)]);
  assert.deepEqual(current.swipeExclusions, [{ type: 'card', value: 'F03', source: 'swipe', origin: 'F03' }]);
  assert.ok(current.exclusions.cardIds.has('F03'));
  assert.deepEqual(tasteSignals(current), []);
  const profile = buildProfile(current);
  assert.deepEqual(profile.intolerant, ['F03']);
  assert.ok(!Object.values(profile.taste).flat().includes('F03'));
  assert.equal(progress(current, config).answered, 1);
});

test('INTOLERANT mit Auswahl: nur die gewählten Kinder werden ausgeschlossen', () => {
  const hazelnut = index.cards.find((card) => card.allergens.includes('hazelnut')).id;
  const current = state([answer('F01', LIKE), answer('F13', INTOLERANT, { excludedCardIds: [hazelnut] })]);
  assert.ok(current.exclusions.cardIds.has(hazelnut));
  assert.ok(!current.exclusions.cardIds.has('F13'));
});

test('INTOLERANT auf einer Familie entfernt sie aus den nächsten Karten', () => {
  const current = state([answer('F01', INTOLERANT, { excludedCardIds: ['F02'] })]);
  assert.ok(!selectNextCards(current, config).some((card) => card.id === 'F02'));
});

test('UNDO stellt den vorherigen Zustand exakt wieder her (inkl. INTOLERANT)', () => {
  const before = [answer('F01', LIKE), answer('F02', DISLIKE)];
  const withIntolerant = [...before, answer('F03', INTOLERANT)];
  assert.deepEqual(state([...withIntolerant, answer('F03', UNDO)]), state(before));
  assert.deepEqual(state([...before, answer('F03', PREFER), answer('F03', UNDO)]), state(before));
  // Mehrere UNDO hintereinander nehmen mehrere Antworten zurück.
  assert.deepEqual(state([...withIntolerant, answer('F03', UNDO), answer('F02', UNDO)]), state([before[0]]));
  // Danach kann die Karte neu beantwortet werden.
  const redone = state([...withIntolerant, answer('F03', UNDO), answer('F03', LIKE)]);
  assert.equal(redone.answers.F03, LIKE);
  assert.ok(!redone.exclusions.cardIds.has('F03'));
});

test('UNDO ohne vorherige Antwort ändert nichts', () => {
  assert.deepEqual(state([answer('F01', UNDO)]), state([]));
});

test('Eine Karte wird nicht doppelt beantwortet', () => {
  const played = replay([answer('F01', LIKE), answer('F01', DISLIKE)]);
  assert.equal(played.answers.F01, LIKE);
  assert.deepEqual(played.sequence, ['F01']);
});
