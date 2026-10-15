import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexCatalog } from './catalog.js';
import { deriveRoundState } from './engine.js';
import { drawHoldout, HOLDOUT_METHOD, seededRandom } from './holdout.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const { diets } = read('../data/stage0.json');
const state = (onboarding = { diet: null, exclusions: [], cardLabels: {} }) => deriveRoundState({ index, onboarding, diets, events: [] });
const familyOf = (id) => index.get(id).parentId;

test('Zufall aus der sessionId: gleiche Sitzung, gleiche Kontrollkarten', () => {
  const first = seededRandom('abc');
  const second = seededRandom('abc');
  const values = Array.from({ length: 5 }, () => first());
  assert.deepEqual(Array.from({ length: 5 }, () => second()), values);
  assert.ok(values.every((value) => value >= 0 && value < 1));
  assert.deepEqual(drawHoldout(state(), { count: 6, seed: 'abc' }), drawHoldout(state(), { count: 6, seed: 'abc' }));
  assert.notDeepEqual(drawHoldout(state(), { count: 6, seed: 'abc' }).cardIds, drawHoldout(state(), { count: 6, seed: 'xyz' }).cardIds);
});

test('Sechs Untergruppen aus sechs verschiedenen Gruppen, nie eine Gruppe selbst', () => {
  for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    const { cardIds, method, eligible } = drawHoldout(state(), { count: 6, seed });
    assert.equal(method, HOLDOUT_METHOD);
    assert.equal(eligible, 36, 'alle Untergruppen der Stufe 2');
    assert.equal(cardIds.length, 6);
    assert.ok(cardIds.every((id) => index.get(id).stage === 2), seed);
    assert.equal(new Set(cardIds.map(familyOf)).size, 6, `${seed}: geschichtet nach Gruppe`);
  }
});

test('Ohne Kontrollkarten (0) wird nichts zurückgehalten; mehr als Gruppen geht in eine zweite Runde', () => {
  assert.deepEqual(drawHoldout(state(), { count: 0, seed: 'a' }).cardIds, []);
  const many = drawHoldout(state(), { count: 14, seed: 'a' }).cardIds;
  assert.equal(many.length, 14);
  assert.equal(new Set(many).size, 14);
  // 11 Gruppen haben Untergruppen: die ersten 11 Karten aus 11 verschiedenen Gruppen
  assert.equal(new Set(many.slice(0, 11).map(familyOf)).size, 11);
  assert.equal(drawHoldout(state(), { count: 100, seed: 'a' }).cardIds.length, 36);
});

test('Nur Sichtbares: vegetarisch ohne Fleisch und Fisch, „Nie vorschlagen“ wirkt auch hier', () => {
  const vegetarian = state({ diet: 'vegetarian', exclusions: [{ type: 'card', value: 'F12', source: 'onboarding' }], cardLabels: {} });
  for (const seed of ['a', 'b', 'c', 'd']) {
    const { cardIds, eligible } = drawHoldout(vegetarian, { count: 10, seed });
    assert.ok(!cardIds.some((id) => ['F01', 'F02', 'F12'].includes(familyOf(id))), seed);
    assert.equal(eligible, 36 - 6 - 5);
  }
});
