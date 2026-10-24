import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { click, render, setupDom, type } from '../test/dom.js';

const dom = setupDom();
after(() => dom.window.close());
const { createElement: h, useState } = await import('react');
const { default: AllergenPicker } = await import('./AllergenPicker.jsx');
const { indexCatalog } = await import('../logic/catalog.js');
const { deriveOnboarding, emptyAnswers, createRedundancyCheck } = await import('../logic/stage0.js');
const { deriveRoundState, selectNextCards } = await import('../logic/engine.js');
const { groupExclusions } = await import('../logic/profile.js');
const { ONBOARDING } = await import('../labels.js');
const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const allergens = read('../data/allergens.json');
const definition = read('../data/stage0.json');
const index = indexCatalog(read('../data/catalog.json').cards);
const blank = emptyAnswers(definition.questions);

async function setup(initial = {}, extra = {}) {
  let answer;
  function Harness() {
    const [value, setValue] = useState({ ...blank.intolerances, gate: 'yes', ...initial });
    answer = value;
    return h(AllergenPicker, { data: allergens, catalogIndex: index, answer: value, onChange: setValue, ...extra });
  }
  const view = await render(h(Harness));
  return { ...view, answer: () => answer, tile: (name) => [...view.container.querySelectorAll('.tile')].find((tile) => tile.querySelector('.tile-label').textContent === name) };
}

test('Genau sechs feste Vorschläge, keine Erweiterung und keine zusätzliche Kachel für gesuchte Auswahlen', async () => {
  const view = await setup({ selected: ['fish', 'celery'] });
  assert.deepEqual([...view.container.querySelectorAll('.tile-label')].map((el) => el.textContent.replaceAll('\u00ad', '')), ['Gluten', 'Laktose', 'Milcheiweiss', 'Nüsse', 'Eier', 'Soja']);
  assert.equal(view.container.querySelectorAll('.tile').length, 6);
  assert.equal(view.container.querySelector('.more-button'), null);
  assert.ok(!/Mehr anzeigen|Weitere anzeigen|Weniger anzeigen/.test(view.container.textContent));
  assert.ok(view.container.querySelector('[aria-label="Fisch entfernen"]'));
  await view.unmount();
});

test('Kacheln und Suche teilen die Auswahl: kombinieren, Auswahl erkennen, entfernen und keine Duplikate', async () => {
  const view = await setup();
  await click(view.tile('Soja'));
  await click(view.tile('Eier'));
  const input = view.container.querySelector('input[type="search"]');
  await type(input, 'Fisch');
  await click(view.container.querySelector('.search-hit'));
  assert.deepEqual(view.answer().selected, ['soy', 'egg', 'fish']);
  assert.equal(view.container.querySelectorAll('.tile').length, 6);
  await type(input, 'Soja');
  assert.equal(view.container.querySelector('.search-hit').getAttribute('aria-pressed'), 'true');
  await click(view.container.querySelector('.search-hit'));
  assert.deepEqual(view.answer().selected, ['egg', 'fish'], 'erneutes Antippen entfernt den Eintrag');
  await click(view.tile('Soja'));
  await click(view.container.querySelector('[aria-label="Fisch entfernen"]'));
  assert.deepEqual(view.answer().selected, ['egg', 'soy']);
  assert.equal(new Set(view.answer().selected).size, view.answer().selected.length);
  await view.unmount();
});

test('Nuss-Details speichern granulare IDs; Laktose wählt kein Milcheiweiss aus', async () => {
  const view = await setup();
  await click(view.tile('Laktose'));
  assert.deepEqual(view.answer().selected, ['lactose']);
  await click(view.tile('Nüsse'));
  await click(document.querySelector('input[value="hazelnut"]'));
  const confirm = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Übernehmen');
  await click(confirm);
  assert.deepEqual(view.answer().selected, ['lactose', 'hazelnut']);
  await view.unmount();
});

test('Abgedeckte Optionen bleiben unter den sechs sichtbar; bestehende Auswahlen bleiben entfernbar', async () => {
  const answers = { ...blank, diet: { form: 'vegan', exclusions: [], rules: [] } };
  const redundancy = createRedundancyCheck(definition, answers, { allergens, catalogIndex: index, upTo: 1 });
  const view = await setup({ selected: ['egg'] }, { redundancy });
  assert.equal(view.container.querySelectorAll('.tile').length, 6);
  assert.equal(view.tile('Laktose').disabled, true);
  assert.equal(view.tile('Eier').disabled, false);
  await click(view.tile('Eier'));
  assert.equal(view.tile('Eier').disabled, true);
  await view.unmount();
});

test('Auswahl bleibt bei Wiederherstellung erhalten und Kachel- sowie Suchallergene wirken im Sicherheitsfilter', async () => {
  const view = await setup();
  await click(view.tile('Soja'));
  await type(view.container.querySelector('input[type="search"]'), 'Fisch');
  await click(view.container.querySelector('.search-hit'));
  const saved = JSON.parse(JSON.stringify(view.answer()));
  await view.unmount();
  const restored = await setup(saved);
  const onboarding = deriveOnboarding(definition, { ...blank, intolerances: restored.answer() }, { allergens, catalogIndex: index });
  const round = deriveRoundState({ index, onboarding, diets: definition.diets, events: [], round: 4 });
  assert.ok(round.exclusions.allergens.has('soy') && round.exclusions.allergens.has('fish'));
  assert.ok(selectNextCards(round).every((card) => !card.allergens.includes('soy') && !card.allergens.includes('fish')));
  assert.ok(restored.container.querySelector('[aria-label="Fisch entfernen"]'));
  await restored.unmount();
});

test('Unbekannter Freitext bleibt eine ungeprüfte Notiz und wird nicht zum erfundenen Allergen', async () => {
  const view = await setup();
  await type(view.container.querySelector('input[type="search"]'), 'Omas Spezialsauce');
  assert.ok(view.container.textContent.includes(ONBOARDING.allergyNoteEffect));
  await click(view.container.querySelector('.add-entry'));
  assert.deepEqual(view.answer().selected, []);
  assert.deepEqual(view.answer().notes, ['Omas Spezialsauce']);
  const onboarding = deriveOnboarding(definition, { ...blank, intolerances: view.answer() }, { allergens, catalogIndex: index });
  assert.equal(onboarding.exclusions[0].freeText, true);
  const grouped = groupExclusions(onboarding.exclusions, { allergens, index });
  assert.deepEqual(grouped.notes[0].flags, ['check']);
  assert.deepEqual(grouped.allergies, []);
  await view.unmount();
});
