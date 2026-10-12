import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexCatalog } from './catalog.js';
import { deriveOnboarding, emptyAnswers, isAnswered, searchNever, uncertaintyFlag } from './stage0.js';
import { describeSelection, searchAllergens, toggleIds } from './allergens.js';
import { deriveRoundState, eligibleFamilies } from './engine.js';
import { matchRank } from './search.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const definition = read('../data/stage0.json');
const allergens = read('../data/allergens.json');
const index = indexCatalog(read('../data/catalog.json').cards);
const never = definition.questions.find((question) => question.id === 'never');
const intolerances = definition.questions.find((question) => question.id === 'intolerances');

const answersWith = (changes) => ({ ...emptyAnswers(definition.questions), ...changes });
const derive = (answers) => deriveOnboarding(definition, answers, { allergens, catalogIndex: index });
const families = (answers) =>
  eligibleFamilies(deriveRoundState({ index, onboarding: derive(answers), diets: definition.diets })).map((card) => card.id);

test('Ohne Angaben bleiben alle 13 Familien, keine Regeln', () => {
  const answers = answersWith({ diet: 'none', intolerances: { gate: 'no', selected: [], unsureMore: false }, never: { gate: 'no', selected: [], notes: [] } });
  assert.equal(families(answers).length, 13);
  assert.deepEqual(derive(answers).rules, []);
  assert.deepEqual(derive(answers).exclusions, []);
});

test('Allergien werden als granulare Ausschlüsse mit source "onboarding" gespeichert', () => {
  const result = derive(answersWith({ intolerances: { gate: 'yes', selected: ['hazelnut', 'lactose'], unsureMore: false } }));
  assert.deepEqual(
    result.exclusions.map(({ type, value, source }) => [type, value, source]),
    [['allergen', 'hazelnut', 'onboarding'], ['allergen', 'lactose', 'onboarding']]
  );
});

test('Bekannte Allergie und Unsicherheits-Flag gleichzeitig möglich; das Flag schliesst nichts aus', () => {
  const answers = answersWith({ intolerances: { gate: 'yes', selected: ['peanut'], unsureMore: true } });
  const result = derive(answers);
  assert.equal(result.uncertain, true);
  assert.equal(result.exclusions.length, 1);
  assert.equal(uncertaintyFlag(answersWith({ intolerances: { gate: 'unsure', selected: [], unsureMore: false } })), true);
  assert.deepEqual(derive(answersWith({ intolerances: { gate: 'unsure', selected: ['egg'], unsureMore: false } })).exclusions, []);
});

test('„Alle Nüsse“ wählt alle Nüsse, aber keine Erdnüsse', () => {
  const nuts = allergens.categories.find((category) => category.id === 'tree_nuts');
  const selected = toggleIds([], nuts.items.map((item) => item.id));
  assert.equal(selected.length, 8);
  assert.ok(!selected.includes('peanut'));
  assert.deepEqual(describeSelection(allergens, selected).map((chip) => chip.text), ['Alle Nüsse']);
  assert.deepEqual(describeSelection(allergens, ['hazelnut']).map((chip) => chip.text), ['Haselnuss']);
});

test('Frage 3: Treffer wird zum harten Ausschluss mit Katalog-ID', () => {
  const answers = answersWith({ never: { gate: 'yes', selected: ['card:F01.3', 'animalOrigin:seafood'], notes: [] } });
  const result = derive(answers);
  assert.deepEqual(result.exclusions.map(({ type, value }) => [type, value]), [['card', 'F01.3'], ['animalOrigin', 'seafood']]);
  assert.equal(result.cardLabels['F01.3'], 'Schweinefleisch');
  const ids = families(answers);
  assert.ok(ids.includes('F01') && ids.includes('F02'), 'Fleisch ohne Schwein und Fisch ohne Meeresfrüchte bleiben');
});

test('Frage 3: freeTextNote filtert nichts', () => {
  const answers = answersWith({ never: { gate: 'yes', selected: [], notes: ['Koriander'] } });
  const result = derive(answers);
  assert.deepEqual(result.freeTextNotes, ['Koriander']);
  assert.deepEqual(result.exclusions, []);
  assert.equal(families(answers).length, 13);
  assert.equal(isAnswered(never, answers.never), true);
});

test('Jede Schnellauswahl in Frage 3 lässt sich auf eine Katalog-ID oder einen Tag abbilden', () => {
  for (const pick of never.quickPicks) {
    const [type, value] = pick.key.split(':');
    if (type === 'card') assert.ok(index.get(value), pick.key);
    else assert.ok(index.cards.some((card) => card[type]?.includes(value)), pick.key);
  }
});

test('Suche ist tolerant gegenüber Gross-/Kleinschreibung und Umlauten', () => {
  assert.equal(matchRank('Käse', 'kaese'), 0);
  assert.equal(matchRank('Käse', 'KASE'), 0);
  assert.equal(matchRank('Nüsse und Samen', 'nusse'), 0);
  assert.equal(searchNever(never, index, 'schwein')[0].key, 'card:F01.3');
  const speck = searchNever(never, index, 'Speck')[0];
  assert.equal(speck.key, 'card:F01.3');
  assert.equal(speck.matchedTerm, 'Speck');
  assert.deepEqual(searchNever(never, index, 'Koriander'), []);
  assert.equal(searchAllergens(allergens, 'haselnuss')[0].key, 'hazelnut');
  assert.ok(searchAllergens(allergens, 'Milch').some((hit) => hit.key === 'lactose'));
  assert.ok(searchAllergens(allergens, 'Milch').some((hit) => hit.key === 'milk_protein'));
});

test('Bei „Ja“ ohne Auswahl ist die Frage noch nicht beantwortet', () => {
  assert.equal(isAnswered(intolerances, { gate: 'yes', selected: [], unsureMore: true }), false);
  assert.equal(isAnswered(intolerances, { gate: 'no', selected: [], unsureMore: false }), true);
  assert.equal(isAnswered(never, { gate: 'yes', selected: [], notes: [] }), false);
});

test('Gleiche Antworten ergeben immer dieselben Regeln', () => {
  const answers = answersWith({ diet: 'pescetarian', never: { gate: 'yes', selected: ['card:F05.4'], notes: [] } });
  assert.deepEqual(derive(answers), derive(answers));
});
