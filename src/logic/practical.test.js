import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { brandItems, EMPTY_PRACTICAL, matchBrand, missingAppliances, practicalAnswered, practicalOf, summarizePractical } from './practical.js';
import { PRACTICAL_SAVED } from './events.js';
import { PRACTICAL, SEARCH } from '../labels.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const definition = read('../data/practical.json');
const brands = read('../data/brands.json');

test('Alltagsprofil: sechs Bereiche nach nurec v0.2, Kap. 2.3', () => {
  assert.deepEqual(
    definition.questions.map((question) => question.dimension),
    ['Kochzeit', 'Küchengeräte', 'Budget', 'Einkaufsorte', 'Convenience', 'Packungsgrösse']
  );
  for (const question of definition.questions) {
    assert.ok(question.title && question.options.length > 0, question.id);
    assert.ok(question.id in EMPTY_PRACTICAL, `${question.id} im leeren Profil`);
  }
});

test('Nichts angegeben heisst „unbekannt“; es gilt das letzte gespeicherte Alltagsprofil', () => {
  assert.equal(practicalOf([]), null);
  assert.equal(practicalAnswered(definition, null), 0);
  const events = [
    { type: PRACTICAL_SAVED, practical: { ...EMPTY_PRACTICAL, budget: 'low' } },
    { type: PRACTICAL_SAVED, practical: { ...EMPTY_PRACTICAL, budget: 'medium', cookingTime: { weekday: 'short', weekend: null }, appliances: ['stove', 'fridge'] } },
  ];
  const practical = practicalOf(events);
  assert.equal(practical.budget, 'medium');
  assert.equal(practicalAnswered(definition, practical), 3);
  // Feste Grenze: Was fehlt, steht als fehlendes Gerät da (kein Ofen), nicht als Abneigung
  assert.deepEqual(missingAppliances(definition, practical), ['oven', 'microwave', 'blender', 'freezer']);
  assert.deepEqual(missingAppliances(definition, { ...practical, appliances: null }), [], 'übersprungen: keine Grenze');
});

test('Zusammenfassung für „Mein Profil“ in Worten, Marken getrennt', () => {
  const practical = { ...EMPTY_PRACTICAL, cookingTime: { weekday: 'short', weekend: 'long' }, budget: 'low', budgetLimit: '10', shops: ['migros', 'market'], brandsPreferred: ['M-Budget'], household: '2', leftovers: 'yes' };
  const lines = summarizePractical(definition, practical, PRACTICAL);
  const byId = Object.fromEntries(lines.map((line) => [line.id, line.text]));
  assert.equal(byId.cookingTime, 'Werktags: 15 bis 30 Minuten · Am Wochenende: Mehr als eine Stunde');
  assert.equal(byId.budget, 'Eher günstig · Bis 10 Franken');
  assert.equal(byId.shops, 'Migros, Markt oder Hofladen');
  assert.equal(byId.brandsPreferred, 'M-Budget');
  assert.equal(byId.household, 'Für zwei · Ja, gerne');
  assert.ok(!('appliances' in byId), 'übersprungen erscheint nicht');
});

test('Marken und Händler: genau zuordnen, Eigenmarken mit Händler, Unbekanntes bleibt Text', () => {
  const items = brandItems(brands, SEARCH);
  assert.equal(items.find((item) => item.label === 'M-Budget').category, 'Marke von Migros');
  assert.equal(items.find((item) => item.label === 'Denner').category, 'Händler');
  assert.equal(matchBrand(brands, 'm-budget')?.id, 'm-budget');
  assert.equal(matchBrand(brands, 'Aldi')?.id, 'aldi', 'Synonym');
  assert.equal(matchBrand(brands, 'Omas Hofladen'), null);
  assert.equal(new Set(brands.entries.map((entry) => entry.id)).size, brands.entries.length, 'keine doppelten IDs');
});
