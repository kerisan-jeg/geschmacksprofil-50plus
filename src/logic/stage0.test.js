import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { annotateFamilies, deriveRules, emptyAnswers, isAnswered } from './stage0.js';
import { createRound } from './engine.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const definition = read('../data/stage0.json');
const catalog = read('../data/catalog.json').cards;
const familyCount = catalog.filter((card) => card.level === 1).length;

function answersWith(changes) {
  return { ...emptyAnswers(definition.questions), ...changes };
}

function deck(answers) {
  const rules = deriveRules(definition, answers, catalog);
  return createRound(annotateFamilies(catalog, rules), 1, { excludedIds: rules.excludedIds }).cards;
}

test('Ohne Angaben bleiben alle Familien im Stapel', () => {
  const answers = answersWith({ diet: 'none', intolerances: { gate: 'no', selected: [] }, never: { gate: 'no', selected: [] } });
  assert.equal(deck(answers).length, familyCount);
  assert.deepEqual(deriveRules(definition, answers, catalog).rules, []);
});

test('Vegan entfernt Fleisch, Fisch, Eier und Milchprodukte samt Untergruppen', () => {
  const rules = deriveRules(definition, answersWith({ diet: 'vegan' }), catalog);
  for (const id of ['F01', 'F01.3', 'F02', 'F02.2', 'F03', 'F04', 'F04.2']) {
    assert.ok(rules.excludedIds.includes(id), id);
  }
  const ids = deck(answersWith({ diet: 'vegan' })).map((card) => card.id);
  assert.equal(ids.length, familyCount - 4);
  assert.ok(!ids.includes('F01') && !ids.includes('F04'));
});

test('Eine Familie entfällt, wenn alle Untergruppen ausgeschlossen sind', () => {
  const answers = answersWith({ intolerances: { gate: 'yes', selected: ['fish', 'crustaceans', 'molluscs'] } });
  assert.ok(deriveRules(definition, answers, catalog).excludedIds.includes('F02'));
});

test('Erlaubte Untergruppen bleiben: Hinweis und passende Beispiele', () => {
  const answers = answersWith({ intolerances: { gate: 'yes', selected: ['crustaceans'] } });
  const fish = deck(answers).find((card) => card.id === 'F02');
  assert.ok(fish, 'Fisch und Meeresfrüchte bleibt im Stapel');
  assert.deepEqual(fish.notes, ['Ohne Krebstiere']);
  assert.deepEqual(fish.examples, ['Lachs', 'Miesmuscheln']);
});

test('Hinweise nutzen die Worte aus dem Fragebogen und erscheinen nur einmal', () => {
  const answers = answersWith({ never: { gate: 'yes', selected: ['pork', 'seafood'] } });
  const cards = deck(answers);
  assert.deepEqual(cards.find((card) => card.id === 'F01').notes, ['Ohne Schweinefleisch']);
  assert.deepEqual(cards.find((card) => card.id === 'F02').notes, ['Ohne Meeresfrüchte']);
  assert.deepEqual(cards.find((card) => card.id === 'F02').examples, ['Lachs', 'Kabeljau']);
});

test('Gluten führt zu Hinweisen statt zum Ausschluss', () => {
  const answers = answersWith({ intolerances: { gate: 'yes', selected: ['gluten'] } });
  const cards = deck(answers);
  assert.equal(cards.length, familyCount);
  assert.deepEqual(cards.find((card) => card.id === 'F06').notes, ['Nur glutenfrei']);
  assert.equal(cards.find((card) => card.id === 'F09').notes, undefined);
});

test('Sesam blendet Sesam als Beispiel aus', () => {
  const answers = answersWith({ intolerances: { gate: 'yes', selected: ['nuts', 'sesame'] } });
  const seeds = deck(answers).find((card) => card.id === 'F13');
  assert.ok(!seeds.examples.includes('Sesam'));
  assert.deepEqual(seeds.notes, ['Ohne Nüsse']);
});

test('„Unsicher“ wird vermerkt und gibt nichts frei', () => {
  const rules = deriveRules(definition, answersWith({ intolerances: { gate: 'unsure', selected: ['egg'] } }), catalog);
  assert.deepEqual(rules.unsure, ['intolerances']);
  assert.deepEqual(rules.excludedIds, []);
});

test('Bei „Ja“ ohne Auswahl ist die Frage noch nicht beantwortet', () => {
  const question = definition.questions.find((item) => item.id === 'intolerances');
  assert.equal(isAnswered(question, { gate: 'yes', selected: [] }), false);
  assert.equal(isAnswered(question, { gate: 'no', selected: [] }), true);
});

test('Gleiche Antworten ergeben immer dieselben Regeln', () => {
  const answers = answersWith({ diet: 'pescetarian', never: { gate: 'yes', selected: ['seafood', 'soy'] } });
  assert.deepEqual(deriveRules(definition, answers, catalog), deriveRules(definition, answers, catalog));
});
