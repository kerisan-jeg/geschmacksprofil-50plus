import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexCatalog } from './catalog.js';
import { createRedundancyCheck, deriveOnboarding, emptyAnswers, isAnswered, searchIntolerances, searchNever, uncertaintyFlag } from './stage0.js';
import { describeSelection, searchAllergens, toggleIds } from './allergens.js';
import { deriveRoundState, eligibleFamilies } from './engine.js';
import { matchRank } from './search.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const definition = read('../data/stage0.json');
const allergens = read('../data/allergens.json');
const index = indexCatalog(read('../data/catalog.json').cards);
const never = definition.questions.find((question) => question.id === 'never');
const intolerances = definition.questions.find((question) => question.id === 'intolerances');

const empty = emptyAnswers(definition.questions);
const answersWith = (changes) => ({ ...empty, ...changes });
const yes2 = (changes) => ({ ...empty.intolerances, gate: 'yes', ...changes });
const yes3 = (changes) => ({ ...empty.never, gate: 'yes', ...changes });
const derive = (answers) => deriveOnboarding(definition, answers, { allergens, catalogIndex: index });
const families = (answers) =>
  eligibleFamilies(deriveRoundState({ index, onboarding: derive(answers), diets: definition.diets })).map((card) => card.id);

test('Ohne Angaben bleiben alle 13 Familien, keine Regeln', () => {
  const answers = answersWith({ diet: 'none', intolerances: { ...empty.intolerances, gate: 'no' }, never: { ...empty.never, gate: 'no' } });
  assert.equal(families(answers).length, 13);
  assert.deepEqual(derive(answers).rules, []);
  assert.deepEqual(derive(answers).exclusions, []);
});

test('Allergien werden als granulare Ausschlüsse mit source "onboarding" gespeichert', () => {
  const result = derive(answersWith({ intolerances: yes2({ selected: ['hazelnut', 'lactose'] }) }));
  assert.deepEqual(
    result.exclusions.map(({ type, value, source }) => [type, value, source]),
    [['allergen', 'hazelnut', 'onboarding'], ['allergen', 'lactose', 'onboarding']]
  );
});

test('Bekannte Allergie und Unsicherheits-Flag gleichzeitig möglich; das Flag schliesst nichts aus', () => {
  const answers = answersWith({ intolerances: yes2({ selected: ['peanut'], unsureMore: true }) });
  const result = derive(answers);
  assert.equal(result.uncertain, true);
  assert.equal(result.exclusions.length, 1);
});

test('Frage 2 bietet nur Ja und Keine bekannt; eine alte Unsicher-Antwort ist ungültig', () => {
  assert.deepEqual(intolerances.gate, [{ id: 'yes', label: 'Ja' }, { id: 'no', label: 'Keine bekannt' }]);
  const legacyAnswer = { ...empty.intolerances, gate: 'unsure', selected: ['egg'] };
  assert.equal(isAnswered(intolerances, legacyAnswer), false);
  assert.equal(uncertaintyFlag(answersWith({ intolerances: legacyAnswer })), false);
  assert.deepEqual(derive(answersWith({ intolerances: legacyAnswer })).exclusions, []);
});

test('Frage 3 fragt exakt nach etwas Weiterem', () => {
  assert.equal(never.title, 'Gibt es etwas Weiteres, das wir dir nie vorschlagen dürfen?');
});

test('„Alle Nüsse“ schliesst Erdnüsse ein; eine Erdnuss allein bleibt einzeln wählbar', () => {
  const nuts = allergens.categories.find((category) => category.id === 'tree_nuts');
  const selected = toggleIds([], nuts.items.map((item) => item.id));
  assert.equal(selected.length, 9);
  assert.ok(selected.includes('peanut'));
  assert.deepEqual(describeSelection(allergens, selected).map((chip) => chip.text), ['Alle Nüsse (inkl. Erdnüsse)']);
  assert.deepEqual(describeSelection(allergens, ['peanut']).map((chip) => chip.text), ['Erdnuss']);
  assert.equal(searchIntolerances(allergens, index, 'erdnuss')[0].key, 'peanut');
});

test('Frage 3: Treffer wird zum harten Ausschluss mit Katalog-ID', () => {
  const answers = answersWith({ never: yes3({ selected: ['card:F01.3', 'animalOrigin:seafood'] }) });
  const result = derive(answers);
  assert.deepEqual(result.exclusions.map(({ type, value }) => [type, value]), [['card', 'F01.3'], ['animalOrigin', 'seafood']]);
  assert.equal(result.cardLabels['F01.3'], 'Schweinefleisch');
  const ids = families(answers);
  assert.ok(ids.includes('F01') && ids.includes('F02'), 'Fleisch ohne Schwein und Fisch ohne Meeresfrüchte bleiben');
});

test('Eingetippter Text wird eingetragen: keine Karte fällt weg, das Wort verschwindet als Beispiel', () => {
  const answers = answersWith({ never: yes3({ notes: ['Koriander'] }), intolerances: yes2({ notes: ['Tomaten'] }) });
  const result = derive(answers);
  assert.deepEqual(result.freeTextNotes, ['Tomaten', 'Koriander']);
  assert.deepEqual(result.exclusions.map(({ type, value, origin }) => [type, value, origin]), [['food', 'Tomaten', 'intolerances'], ['food', 'Koriander', 'never']]);
  assert.equal(families(answers).length, 13);
  assert.equal(isAnswered(never, answers.never), true);
  assert.equal(isAnswered(intolerances, answers.intolerances), true);
});

test('Frage 2: Suche findet auch Lebensmittel, die kein Allergen sind', () => {
  const tomato = searchIntolerances(allergens, index, 'Tomate');
  assert.deepEqual(tomato.map((hit) => hit.key), ['food:Tomate']);
  const answers = answersWith({ intolerances: yes2({ items: ['food:Tomate', 'card:F05.3'] }) });
  const result = derive(answers);
  assert.deepEqual(result.exclusions.map(({ type, value }) => [type, value]), [['food', 'Tomate'], ['card', 'F05.3']]);
  assert.ok(result.rules.some((rule) => rule.text === 'Tomate'));
});

test('Marken und Herkunft werden gespeichert, schliessen aber nichts aus', () => {
  const answers = answersWith({ never: yes3({ brands: ['Marke X'], origins: ['Übersee'] }) });
  const result = derive(answers);
  assert.deepEqual(result.avoidBrands, ['Marke X']);
  assert.deepEqual(result.avoidOrigins, ['Übersee']);
  assert.deepEqual(result.exclusions, []);
  assert.equal(families(answers).length, 13);
  assert.equal(isAnswered(never, answers.never), true);
});

test('Was die Ernährungsweise schon ausschliesst, wird nicht nochmals angeboten', () => {
  const check = (answers, step) => createRedundancyCheck(definition, answers, { allergens, catalogIndex: index, upTo: step });
  const category = (id) => allergens.categories.find((entry) => entry.id === id);
  const vegan = check(answersWith({ diet: 'vegan' }), 1);
  for (const id of ['fish', 'crustaceans', 'molluscs', 'egg', 'milk_protein', 'lactose']) assert.equal(vegan.category(category(id)), true, id);
  for (const id of ['gluten', 'tree_nuts', 'soy', 'celery']) assert.equal(vegan.category(category(id)), false, id);
  const pescetarian = check(answersWith({ diet: 'pescetarian' }), 2);
  assert.equal(pescetarian.key('card:F01.3'), true, 'Schweinefleisch');
  assert.equal(pescetarian.key('card:F05.4'), false, 'Tofu und Soja');
  assert.equal(pescetarian.key('animalOrigin:seafood'), false, 'Meeresfrüchte');
  // Krebstier-Allergie: Meeresfrüchte bleiben wegen der Muscheln sinnvoll, Garnelen nicht.
  const crust = check(answersWith({ intolerances: yes2({ selected: ['crustaceans'] }) }), 2);
  assert.equal(crust.key('animalOrigin:seafood'), false);
  assert.equal(crust.key('card:F02.2'), true);
  // Lebensmittel: Lachs ist bei vegetarisch schon weg
  assert.equal(check(answersWith({ diet: 'vegetarian' }), 2).key('food:Lachs'), true);
  // Später gewählte Antworten zählen für frühere Fragen nicht
  const later = check(answersWith({ never: yes3({ selected: ['card:F02.1'] }) }), 1);
  assert.equal(later.category(category('fish')), false);
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
  assert.equal(isAnswered(intolerances, yes2({ unsureMore: true })), false);
  assert.equal(isAnswered(intolerances, { ...empty.intolerances, gate: 'no' }), true);
  assert.equal(isAnswered(never, yes3({})), false);
});

test('Gleiche Antworten ergeben immer dieselben Regeln', () => {
  const answers = answersWith({ diet: 'pescetarian', never: yes3({ selected: ['card:F05.4'] }) });
  assert.deepEqual(derive(answers), derive(answers));
});
