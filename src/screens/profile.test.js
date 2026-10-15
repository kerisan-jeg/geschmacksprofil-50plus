import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { click, render, setupDom } from '../test/dom.js';

const dom = setupDom();
after(() => dom.window.close());
const { createElement: h } = await import('react');
const { default: ProfileScreen } = await import('./ProfileScreen.jsx');
const { PROFILE } = await import('../labels.js');
const { indexCatalog } = await import('../logic/catalog.js');
const { deriveRoundState } = await import('../logic/engine.js');

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const stage0 = read('../data/stage0.json');
const allergens = read('../data/allergens.json');
const onboarding = { diet: null, exclusions: [], cardLabels: {}, uncertain: false, avoidBrands: [], avoidOrigins: [], freeTextNotes: [] };
const dietOptions = { options: stage0.questions.find((question) => question.id === 'diet').options, diets: stage0.diets, tagLabels: {} };

const events = [
  { type: 'HOLDOUT_DRAWN', cardIds: ['F12.3'] },
  { cardId: 'F12', response: 'LIKE', round: 1 },
  { cardId: 'F02', response: 'DISLIKE', round: 1 },
];

async function setup() {
  const calls = [];
  const round = deriveRoundState({ index, onboarding, diets: stage0.diets, events });
  const onChange = { confirmPrediction: (...args) => calls.push(args), rating() {}, addExclusions() {}, removeExclusions() {}, diet() {} };
  const view = await render(
    h(ProfileScreen, { round, onboarding, account: null, index, allergens, foods: [], dietOptions, steps: [], canSignOut: false, onCreate() {}, onRestart() {}, onSignOut() {}, onChange })
  );
  return { ...view, calls };
}

test('„Mein Profil“ zeigt die Vermutungen getrennt, mit Begründung und ohne offene Kontrollkarten', async () => {
  const view = await setup();
  const text = view.container.textContent;
  assert.ok(text.includes(PROFILE.derived.title));
  assert.ok(text.includes(PROFILE.derived.groups.LIKE) && text.includes(PROFILE.derived.groups.DISLIKE));
  assert.ok(text.includes(PROFILE.derived.reason('Obst', 'LIKE')));
  assert.ok(text.includes(PROFILE.derived.reason('Fisch und Meeresfrüchte', 'DISLIKE')));
  const derivedTitles = [...view.container.querySelectorAll('.is-derived .taste-title')].map((node) => node.textContent);
  assert.ok(derivedTitles.includes('Beeren'));
  assert.ok(!derivedTitles.includes('Steinobst'), 'Kontrollkarte bleibt verborgen, bis sie beantwortet ist');
  // Obst hat vier sichtbare Vermutungen, Fisch drei: alle ohne „Alle anzeigen“
  assert.equal(view.container.querySelector('.is-derived .more-button'), null);
  await view.unmount();
});

test('Tippen auf eine Vermutung öffnet die Bewertung; die Antwort ersetzt die Vermutung', async () => {
  const view = await setup();
  const berries = [...view.container.querySelectorAll('.is-derived .taste-row')].find((row) => row.textContent.includes('Beeren'));
  await click(berries);
  const sheet = document.querySelector('[role="dialog"]') ?? view.container;
  assert.ok(sheet.textContent.includes(PROFILE.derived.sheetIntro('LIKE')));
  assert.ok(!sheet.textContent.includes(PROFILE.ratingRemove), 'nichts zu entfernen');
  const prefer = [...document.querySelectorAll('[role="radio"]')].at(-1);
  await click(prefer);
  assert.deepEqual(view.calls, [['F12.1', 'PREFER', 0.5]]);
  await view.unmount();
});
