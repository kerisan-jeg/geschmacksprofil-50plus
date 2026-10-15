import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { click, render, setupDom, type } from '../test/dom.js';

const dom = setupDom();
after(() => dom.window.close());
const { createElement: h } = await import('react');
const { default: FoodSearch } = await import('./FoodSearch.jsx');
const { SEARCH } = await import('../labels.js');
const { indexCatalog } = await import('../logic/catalog.js');
const { buildFoodIndex, mergeFoods } = await import('../logic/foodSearch.js');

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const catalog = read('../data/catalog.json');
const items = buildFoodIndex({ catalogIndex: indexCatalog(catalog.cards), foods: mergeFoods(catalog.foods, read('../data/foods.json').foods) });

async function setup() {
  const picked = [];
  const notes = [];
  const view = await render(h(FoodSearch, { label: 'Suchen', items, onPick: (hit) => picked.push(hit.label), onAddNote: (text) => notes.push(text) }));
  const input = view.container.querySelector('input');
  const labels = () => [...view.container.querySelectorAll('.search-hit-label')].map((node) => node.textContent);
  const noteButton = () => view.container.querySelector('.add-entry');
  return { ...view, input, labels, noteButton, picked, notes };
}

test('Ein Lebensmittel aus der Liste ist ein Auswahlfeld, keine Notiz', async () => {
  const view = await setup();
  await type(view.input, 'Oliven');
  assert.equal(view.labels()[0], 'Olive');
  assert.equal(view.noteButton(), null, 'keine Notiz, wenn die Liste es kennt');
  await click(view.container.querySelector('.search-hit'));
  assert.deepEqual(view.picked, ['Olive']);
  await view.unmount();
});

test('Tippfehler: „Meintest du:“, die Notiz bleibt als Ausnahme möglich', async () => {
  const view = await setup();
  await type(view.input, 'Olvie');
  assert.ok(view.container.textContent.includes(SEARCH.didYouMean));
  assert.equal(view.labels()[0], 'Olive');
  assert.ok(view.noteButton());
  await view.unmount();
});

test('Nur wenn wirklich nichts passt: Notiz eintragen', async () => {
  const view = await setup();
  await type(view.input, 'Omas Spezialsauce');
  assert.deepEqual(view.labels(), []);
  assert.ok(view.container.textContent.includes(SEARCH.noResult));
  await click(view.noteButton());
  assert.deepEqual(view.notes, ['Omas Spezialsauce']);
  await view.unmount();
});
