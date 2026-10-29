// Esskulturen der Gerichte (Dozentenfeedback 19.10.2026, Verbesserung 6) und die vier Zusatzgerichte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CUISINE_MIN_RATED } from '../config.js';
import { indexCatalog } from './catalog.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from './answers.js';
import { deriveRoundState } from './engine.js';
import { buildDashboard } from './dashboard.js';
import { cuisinesOf, cuisineTendencies, MIXED } from './cuisines.js';
import { buildExclusions, isVisible } from './filter.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const catalog = read('../data/catalog.json');
const { cuisines: table } = read('../data/cuisines.json');
const index = indexCatalog(catalog.cards);
const { diets } = read('../data/stage0.json');
const allergenIds = new Set(JSON.stringify(read('../data/allergens.json')).match(/"id":"[a-z_]+"/g).map((match) => match.slice(6, -1)));
const dishes = catalog.cards.filter((card) => card.stage === 4);
const NONE = { diet: null, exclusions: [], cardLabels: {} };
const rated = (pairs) => deriveRoundState({ index, onboarding: NONE, diets, events: pairs.map(([cardId, response]) => ({ cardId, response, round: 4 })), round: 4 });

test('Jedes Gericht hat Esskulturen aus der Tabelle; Currys bleiben „asiatisch“; Asiatisch nur mit Gerichten differenziert', () => {
  const ids = new Set(table.map((cuisine) => cuisine.id));
  for (const dish of dishes) {
    assert.ok(dish.cuisines?.length > 0, dish.id);
    assert.ok(dish.cuisines.every((id) => ids.has(id)), dish.id);
  }
  assert.deepEqual(index.get('D15').cuisines, ['asian']);
  assert.deepEqual(index.get('D16').cuisines, ['asian']);
  // Jede Küche der Tabelle hat mindestens ein Gericht (direkt oder über eine Unterküche)
  for (const cuisine of table) assert.ok(dishes.some((dish) => cuisinesOf(dish, table).includes(cuisine.id)), cuisine.id);
  // Seit dem 29.10.2026 gibt es „Indische Küche“ (Dal, Chicken Tikka Masala) als Unterküche von Asiatisch; die allgemeinen
  // Currys (D15, D16) bleiben „asiatisch“. Nie eine Herkunft oder Nationalität der Person.
  assert.ok(!JSON.stringify(table).match(/Herkunft der Person|Nationalität:/i));
  assert.deepEqual(table.find((cuisine) => cuisine.id === 'indian')?.parent, 'asian');
});

test('Die vier Zusatzgerichte: vollständige Tags, ingredientData, eigene Illustration als Bild', () => {
  const added = { D19: 'thai', D20: 'chinese', D21: 'mexican', D22: 'french' };
  for (const [id, cuisine] of Object.entries(added)) {
    const dish = index.get(id);
    assert.equal(dish.kind, 'DISH');
    assert.deepEqual(dish.cuisines, [cuisine]);
    assert.ok(['complete', 'partial'].includes(dish.ingredientData), id);
    assert.ok(dish.allergens.every((tag) => allergenIds.has(tag)), `${id}: Allergen-IDs`);
    assert.ok(dish.ingredients.length > 0 && dish.ingredients.every((ingredient) => index.get(ingredient)), `${id}: Zutaten-Karten`);
    assert.ok(dish.ingredientNames.length >= 4, id);
    assert.equal(dish.illustration, 'dish.svg', 'wie alle Gerichte: eigene Illustration, kein Foto');
    if (dish.ingredientData === 'partial') assert.ok(dish.todo, `${id}: Grund für partial`);
    // Fleisch immer mit Fleischart (sonst Regel „unbekannte Fleischart“)
    if (dish.animalOrigin.includes('meat')) assert.ok(dish.animalOrigin.some((tag) => ['pork', 'beef', 'poultry', 'lamb'].includes(tag)), id);
  }
  // Filter wirken auf die neuen Gerichte: vegetarisch ohne Pad Thai und Enchiladas, Erdnussallergie ohne Pad Thai
  const vegetarian = buildExclusions([], { diet: 'vegetarian', diets, index });
  assert.deepEqual(['D19', 'D20', 'D21', 'D22'].filter((id) => isVisible(index.get(id), index, vegetarian)), ['D20', 'D22']);
  assert.ok(!isVisible(index.get('D19'), index, buildExclusions([{ type: 'allergen', value: 'peanut' }], { index })));
});

test('Tendenz erst ab CUISINE_MIN_RATED bewerteten Gerichten; „Kenne ich nicht“ zählt nicht', () => {
  assert.equal(CUISINE_MIN_RATED, 3);
  const two = rated([['D01', LIKE], ['D02', PREFER], ['D10', UNFAMILIAR]]);
  assert.deepEqual(buildDashboard(two, { cuisines: table }).cuisines, [], 'zwei Bewertungen und ein „Kenne ich nicht“ reichen nicht');
  const three = rated([['D01', LIKE], ['D02', PREFER], ['D10', DISLIKE], ['D11', LIKE], ['D21', DISLIKE]]);
  const italian = buildDashboard(three, { cuisines: table }).cuisines;
  assert.deepEqual(italian.map(({ id, rated: count, direction }) => [id, count, direction]), [['italian', 3, LIKE]]);
  // Bewertungen bleiben einzeln gespeichert, auch die mexikanischen
  assert.equal(three.answers.D11, LIKE);
  assert.equal(three.answers.D21, DISLIKE);
});

test('Unterküchen zählen für den Oberbegriff; gleich viele positive wie negative ergeben „gemischt“', () => {
  assert.deepEqual(cuisinesOf(index.get('D19'), table), ['thai', 'asian']);
  const asian = cuisineTendencies(index, [{ id: 'D15', rating: LIKE }, { id: 'D19', rating: DISLIKE }, { id: 'D20', rating: LIKE }, { id: 'D16', rating: DISLIKE }], table);
  assert.deepEqual(asian.map(({ id, rated: count, direction }) => [id, count, direction]), [['asian', 4, MIXED]]);
});
