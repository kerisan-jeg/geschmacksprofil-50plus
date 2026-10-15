import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexCatalog } from './catalog.js';
import { buildFoodIndex, highlightParts, mergeFoods, searchFoods } from './foodSearch.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const catalog = read('../data/catalog.json');
const allergens = read('../data/allergens.json');
const stage0 = read('../data/stage0.json');
const index = indexCatalog(catalog.cards);
const never = stage0.questions.find((question) => question.id === 'never');

const everything = buildFoodIndex({ catalogIndex: index, foods: catalog.foods, allergens, tagLabels: never.tagLabels });
const find = (query) => searchFoods(everything, query);
const first = (query) => find(query)[0];

test('Synonyme inkl. Schweizer Begriffe führen zum richtigen Eintrag', () => {
  const cases = [
    ['Sahne', 'food:Rahm'],
    ['Rüebli', 'food:Karotte'],
    ['Paprika', 'food:Peperoni'],
    ['Feldsalat', 'food:Nüsslisalat'],
    ['Zucchetti', 'food:Zucchini'],
    ['Härdöpfel', 'card:F09'],
  ];
  for (const [query, key] of cases) {
    const hit = first(query);
    assert.equal(hit?.key, key, query);
    assert.ok(hit.matchedTerm, `${query}: Synonym wird genannt`);
  }
  // Poulet ist schon Synonym der Karte Geflügel: Hähnchen findet die Karte über das Lexikon
  const chicken = first('Hähnchen');
  assert.equal(chicken.key, 'card:F01.1');
  assert.equal(chicken.matchedTerm, 'Hähnchen');
});

test('Tolerant gegenüber Gross-/Kleinschreibung und Umlauten (ä = ae = a)', () => {
  for (const query of ['ruebli', 'RÜEBLI', 'Rüebli', 'RUEBLI']) assert.equal(first(query)?.key, 'food:Karotte', query);
  for (const query of ['nuesslisalat', 'Nüsslisalat', 'nusslisalat']) assert.equal(first(query)?.key, 'food:Nüsslisalat', query);
  for (const query of ['haehnchen', 'hahnchen']) assert.equal(first(query)?.key, 'card:F01.1', query);
  assert.equal(first('kaese')?.label.includes('käse') || first('kaese')?.label.includes('Käse'), true);
});

test('Sucht über Allergene, Karten und Familien; Kategorie als Zusatz („Haselnuss · Nüsse“)', () => {
  const hazelnut = first('Hasel');
  assert.deepEqual([hazelnut.kind, hazelnut.label, hazelnut.category], ['allergen', 'Haselnuss', 'Nüsse']);
  const family = find('Fleisch').find((hit) => hit.key === 'card:F01');
  assert.equal(family.category, null, 'Familie: als Lebensmittelgruppe angezeigt');
  const pork = find('Schwein').find((hit) => hit.key === 'card:F01.3');
  assert.equal(pork.category, 'Fleisch und Geflügel');
  const seafood = find('Meeres').find((hit) => hit.key === 'animalOrigin:seafood');
  assert.equal(seafood.kind, 'tag');
});

test('Vorschläge ab dem ersten Zeichen, höchstens 6', () => {
  assert.ok(find('k').length > 0, 'ab dem ersten Zeichen');
  assert.ok(find('k').length <= 6);
  assert.ok(find('e').length <= 6);
  assert.deepEqual(find(''), []);
  assert.deepEqual(find('   '), []);
  assert.deepEqual(find('Koriander'), [], 'kein Treffer: A7 übernimmt (Notiz)');
});

test('Hervorhebung markiert den passenden Teil, auch mit Umlauten', () => {
  assert.deepEqual(highlightParts('Haselnuss', 'hasel'), [{ text: 'Hasel', match: true }, { text: 'nuss', match: false }]);
  assert.deepEqual(highlightParts('Käse', 'kaese'), [{ text: 'Käse', match: true }]);
  assert.deepEqual(highlightParts('Rote Bete', 'bete'), [{ text: 'Rote ', match: false }, { text: 'Bete', match: true }]);
  assert.deepEqual(highlightParts('Nüsse', 'x'), [{ text: 'Nüsse', match: false }]);
});

test('Lexikon im Katalog ist konsistent: Gruppen existieren, keine Doppelten, Synonyme als Liste', () => {
  const names = new Set();
  for (const food of catalog.foods) {
    assert.ok(index.get(food.card), `${food.name}: Karte ${food.card}`);
    assert.ok(Array.isArray(food.synonyms) && food.synonyms.length > 0, food.name);
    assert.ok(!names.has(food.name), `${food.name} doppelt`);
    names.add(food.name);
  }
  for (const pair of [['Rahm', 'Sahne'], ['Poulet', 'Hähnchen'], ['Karotte', 'Rüebli'], ['Peperoni', 'Paprika'], ['Nüsslisalat', 'Feldsalat']]) {
    const food = catalog.foods.find((entry) => entry.name === pair[0]);
    assert.ok(food?.synonyms.includes(pair[1]), pair.join('/'));
  }
  assert.ok(catalog.synonymTodos.length > 0, 'unsichere Begriffe als TODO statt geraten');
});

// ---------- Vollständige Liste: Schweizer Nährwertdatenbank (BLV) ----------

const foodList = read('../data/foods.json');
const allFoods = mergeFoods(catalog.foods, foodList.foods);
const full = buildFoodIndex({ catalogIndex: index, foods: allFoods, allergens, tagLabels: never.tagLabels });
const top = (query) => searchFoods(full, query)[0];

test('Alle Zutaten sind wählbar, auch in der Mehrzahl: „Oliven“ findet Olive vor Olivenöl', () => {
  for (const [query, key] of [
    ['Oliven', 'food:Olive'],
    ['Tomaten', 'food:Tomate'],
    ['Champignons', 'food:Champignon'],
    ['Linse', 'card:F05.1'],
    ['Kichererbse', 'card:F05.3'],
  ]) {
    assert.equal(top(query)?.key, key, query);
  }
  assert.equal(top('Oliven').category, 'Gemüse');
  assert.ok(!searchFoods(full, 'Eier').some((hit) => hit.key === 'food:Ei'), 'Ei ist die Karte „Eier“, kein zweiter Eintrag');
});

test('Schweizer Begriffe, Getränke und Ergänzungen des Teams werden gefunden', () => {
  for (const [query, label] of [
    ['Peterli', 'Petersilie'],
    ['Krautstiel', 'Mangold'],
    ['Rotwein', 'Wein'],
    ['Kaffee', 'Kaffee'],
    ['Hafermilch', 'Hafergetränk'],
    ['Alkohol', 'Alkohol'],
    ['Koriander', 'Koriander'],
    ['Entrecôte', 'Rind'],
  ]) {
    assert.equal(top(query)?.label, label, query);
  }
  assert.equal(searchFoods(full, 'Zucchetti').filter((hit) => /Zucch/.test(hit.label)).length, 1, 'Zucchini und Zucchetti sind ein Eintrag');
});

test('Gerichte gehören in Stufe 4 und stehen nicht in der Liste', () => {
  for (const dish of ['Lasagne', 'Älplermagronen', 'Cordon bleu', 'Saltimbocca']) {
    assert.ok(!searchFoods(full, dish).some((hit) => hit.label.startsWith(dish.split(' ')[0])), dish);
  }
});

test('Tippfehler: ähnliche Einträge statt nichts („Olvie“ → Olive)', () => {
  const hits = searchFoods(full, 'Olvie');
  assert.ok(hits.length > 0 && hits.every((hit) => hit.fuzzy));
  assert.equal(hits[0].label, 'Olive');
  assert.equal(searchFoods(full, 'Wodka')[0]?.label, 'Spirituosen');
  assert.deepEqual(searchFoods(full, 'Omas Spezialsauce'), [], 'wirklich nichts: Notiz als Ausnahme');
});

test('Liste aus der Nährwertdatenbank: Quelle genannt, keine Durchschnittswerte, keine Doppelten', () => {
  assert.match(foodList.source.publisher, /BLV/);
  assert.match(foodList.source.url, /naehrwertdaten\.ch/);
  assert.ok(foodList.foods.length > 500);
  const names = new Set();
  for (const food of foodList.foods) {
    assert.ok(food.category, `${food.name}: Gruppe`);
    assert.ok(!/Durchschnitt|\(|\)|%/.test(food.name), food.name);
    assert.ok(!names.has(food.name), `${food.name} doppelt`);
    names.add(food.name);
  }
  assert.ok(foodList.foods.filter((food) => food.team).every((food) => ['Kräuter', 'Gewürze', 'Getränke mit Alkohol'].includes(food.category)), 'Ergänzungen des Teams sind gekennzeichnet');
  // Handgepflegte Schweizer Begriffe gewinnen beim Zusammenführen
  const karotte = mergeFoods(catalog.foods, foodList.foods).find((food) => food.name === 'Karotte');
  assert.equal(karotte.card, 'F10.3');
  assert.ok(karotte.synonyms.includes('Rüebli'));
});
