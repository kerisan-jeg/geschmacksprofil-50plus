import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexCatalog, validateCatalog } from './catalog.js';
import { buildExclusions, isAllowed, isVisible, annotateCard } from './filter.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const catalog = read('../data/catalog.json').cards;
const { diets } = read('../data/stage0.json');
const allergenData = read('../data/allergens.json');
const index = indexCatalog(catalog);

const card = (id) => index.get(id);
const allergy = (...values) => values.map((value) => ({ type: 'allergen', value, source: 'onboarding' }));
const excl = (entries = [], diet = null) => buildExclusions(entries, { diet, diets, index });
const visible = (id, exclusions) => isVisible(card(id), index, exclusions);

test('Katalog ist konsistent: parentId, children, stage und Tags passen zusammen', () => {
  assert.deepEqual(validateCatalog(catalog), []);
});

test('Alle Allergen-Tags im Katalog stammen aus allergens.json', () => {
  const known = new Set(allergenData.categories.flatMap((category) => (category.items ? category.items.map((item) => item.id) : [category.id])));
  for (const entry of catalog) {
    for (const tag of entry.allergens) assert.ok(known.has(tag), `${entry.id}: ${tag}`);
  }
});

test('Die 14 Hauptallergene sind abgedeckt (Milch getrennt, Erdnüsse unter Nüsse)', () => {
  const ids = allergenData.categories.flatMap((category) => [category.id, ...(category.items ?? []).map((item) => item.id)]);
  for (const id of ['gluten', 'crustaceans', 'egg', 'fish', 'peanut', 'soy', 'lactose', 'milk_protein', 'tree_nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs']) {
    assert.ok(ids.includes(id), id);
  }
  const nuts = allergenData.categories.find((category) => category.id === 'tree_nuts');
  assert.ok(nuts.items.some((item) => item.id === 'peanut'), 'Erdnuss steht unter Nüsse');
  const common = allergenData.categories.filter((category) => category.common).length;
  assert.ok(common >= 6 && common <= 8, `Kacheln: ${common}`);
});

test('vegan → Fleisch, Fisch, Milchprodukte, Eier und Honig gefiltert', () => {
  const vegan = excl([], 'vegan');
  for (const id of ['F01', 'F02', 'F03', 'F04', 'F01.3', 'F02.2', 'F04.2.1']) assert.equal(visible(id, vegan), false, id);
  for (const id of ['F05', 'F09', 'F12', 'F13']) assert.equal(visible(id, vegan), true, id);
  // Im Katalog gibt es noch keine Honigkarte: Die Regel greift trotzdem über den Tag.
  const honey = { id: 'X1', stage: 2, parentId: null, children: [], allergens: [], animalOrigin: ['honey'] };
  assert.equal(isAllowed(honey, vegan), false);
});

test('vegetarisch → Fleisch und Fisch gefiltert, Eier und Milch erlaubt', () => {
  const vegetarian = excl([], 'vegetarian');
  assert.equal(visible('F01', vegetarian), false);
  assert.equal(visible('F02', vegetarian), false);
  assert.equal(visible('F03', vegetarian), true);
  assert.equal(visible('F04', vegetarian), true);
});

test('kein Fisch → Fleisch erlaubt, Fisch und Meeresfrüchte gefiltert', () => {
  const noFish = excl([], 'no_fish');
  assert.equal(visible('F01', noFish), true);
  assert.equal(visible('F01.3', noFish), true);
  assert.equal(visible('F02', noFish), false);
  assert.equal(visible('F03', noFish), true);
});

test('Lebensmittel-Eintrag („Tomate“) entfernt keine Karte, aber das Beispiel', () => {
  const tomato = excl([{ type: 'food', value: 'Tomaten', source: 'onboarding' }]);
  assert.equal(visible('F10.2', tomato), true);
  const raw = annotateCard(card('F10.2'), index, tomato);
  assert.ok(!raw.examples.includes('Tomate'));
  assert.deepEqual(raw.examples, ['Gurke', 'Peperoni']);
  assert.deepEqual(raw.notes, ['Ohne Tomaten']);
  // Familienkarte: Beispiele werden aus den Kindern nachgefüllt
  const apple = annotateCard(card('F12'), index, excl([{ type: 'food', value: 'Apfel', source: 'onboarding' }]));
  assert.ok(!apple.examples.some((example) => /apfel|äpfel/i.test(example)));
  assert.equal(apple.examples.length, 3);
  assert.deepEqual(apple.notes, ['Ohne Apfel']);
});

test('pescetarisch → Fisch erlaubt, Fleisch gefiltert', () => {
  const pescetarian = excl([], 'pescetarian');
  assert.equal(visible('F01', pescetarian), false);
  assert.equal(visible('F02', pescetarian), true);
  assert.equal(visible('F02.1', pescetarian), true);
});

test('Erdnussallergie → Nüsse weiterhin erlaubt', () => {
  const peanut = excl(allergy('peanut'));
  assert.equal(visible('F13', peanut), true);
  for (const id of index.get('F13.1').children) assert.equal(visible(id, peanut), true, id);
});

test('Haselnussallergie → Familie Nüsse sichtbar, Haselnuss gefiltert, Mandel erlaubt', () => {
  const hazelnut = excl(allergy('hazelnut'));
  const hazelnutCard = catalog.find((entry) => entry.allergens.includes('hazelnut'));
  const almondCard = catalog.find((entry) => entry.allergens.includes('almond'));
  assert.equal(visible('F13', hazelnut), true);
  assert.equal(visible('F13.1', hazelnut), true);
  assert.equal(visible(hazelnutCard.id, hazelnut), false);
  assert.equal(visible(almondCard.id, hazelnut), true);
  const shown = annotateCard(card('F13'), index, hazelnut);
  assert.deepEqual(shown.notes, ['Ohne Haselnüsse']);
  assert.ok(!shown.examples.includes('Haselnüsse'));
});

test('Alle Kinder einer Familie ausgeschlossen → Familie nicht angezeigt', () => {
  const seafood = excl(allergy('fish', 'crustaceans', 'molluscs'));
  assert.equal(visible('F02', seafood), false);
  const allNuts = excl(allergy('hazelnut', 'walnut', 'almond', 'cashew', 'pistachio', 'pecan', 'brazil_nut', 'macadamia'));
  assert.equal(visible('F13.1', allNuts), false);
  assert.equal(visible('F13', allNuts), true, 'Kerne und Samen bleiben');
});

test('Laktose und Milcheiweiss sind getrennte Ausschlüsse', () => {
  const lactose = excl(allergy('lactose'));
  const protein = excl(allergy('milk_protein'));
  assert.ok(lactose.allergens.has('lactose') && !lactose.allergens.has('milk_protein'));
  assert.ok(protein.allergens.has('milk_protein') && !protein.allergens.has('lactose'));
  // Eine Karte nur mit Milcheiweiss bleibt bei Laktose erlaubt.
  const proteinOnly = { id: 'X2', allergens: ['milk_protein'], animalOrigin: ['dairy'], children: [] };
  assert.equal(isAllowed(proteinOnly, lactose), true);
  assert.equal(isAllowed(proteinOnly, protein), false);
});

test('Ein Karten-Ausschluss gilt auch für alle Nachkommen', () => {
  const exclusions = excl([{ type: 'card', value: 'F13.1', source: 'swipe' }]);
  assert.equal(visible('F13.1.1', exclusions), false);
  assert.equal(visible('F13', exclusions), true);
});

test('Hinweise nutzen die Worte der Person und passende Beispiele', () => {
  const exclusions = excl([{ type: 'card', value: 'F01.3', source: 'onboarding' }]);
  const meat = annotateCard(card('F01'), index, exclusions, { 'F01.3': 'Schweinefleisch' });
  assert.deepEqual(meat.notes, ['Ohne Schweinefleisch']);
  assert.deepEqual(meat.examples, ['Poulet', 'Rindfleisch']);
  const fish = annotateCard(card('F02'), index, excl(allergy('crustaceans')));
  assert.deepEqual(fish.notes, ['Ohne Krebstiere']);
  assert.deepEqual(fish.examples, ['Lachs', 'Miesmuscheln']);
});

test('Ohne Ausschlüsse bleibt eine Karte unverändert', () => {
  assert.equal(annotateCard(card('F13'), index, excl()), card('F13'));
});
