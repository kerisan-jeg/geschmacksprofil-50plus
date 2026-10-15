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
  // Obst hat viele Vermutungen (Untergruppen und konkrete Lebensmittel): zuerst fünf, der Rest über „Alle anzeigen“.
  // Nur Wahrheitswerte vergleichen: Ein DOM-Element in einer Fehlermeldung bläht die Ausgabe enorm auf.
  const likely = view.container.querySelector('.is-derived');
  assert.equal(likely.querySelectorAll('.taste-row').length, 5);
  const more = likely.querySelector('.more-button');
  assert.ok(Boolean(more), '„Alle anzeigen“ vorhanden');
  await click(more);
  assert.ok(likely.querySelectorAll('.taste-row').length > 5, 'nach „Alle anzeigen“ alle sichtbar');
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

test('Dashboard nach nurec Anhang B: Profilstand, Favoriten, Gruppen, „eher ungern“ mit Ausnahme, Offenes, Alltag', async () => {
  const { PROGRESS } = await import('../labels.js');
  const practicalDefinition = read('../data/practical.json');
  const families = index.cards.filter((card) => card.stage === 1).map((card) => card.id);
  const answers = [
    ...families.slice(0, 11).map((cardId) => ({ cardId, response: { F05: 'DISLIKE', F09: 'UNFAMILIAR' }[cardId] ?? 'LIKE', round: 1 })),
    { cardId: 'F05.4', response: 'LIKE', round: 2 },
    { cardId: 'F05.4.1', response: 'PREFER', round: 2 },
  ];
  const round = deriveRoundState({ index, onboarding, diets: stage0.diets, events: answers });
  const calls = [];
  const view = await render(
    h(ProfileScreen, {
      round,
      onboarding,
      account: null,
      index,
      allergens,
      foods: [],
      dietOptions,
      steps: [],
      next: { type: 'round', number: 2, titles: ['Obst'] },
      practical: null,
      practicalDefinition,
      dishes: { available: false },
      canSignOut: false,
      onCreate() {},
      onNext: (next) => calls.push(next.type),
      onOpenPractical: () => calls.push('practical'),
      onRestart() {},
      onSignOut() {},
      onChange: {},
    })
  );
  const text = view.container.textContent;
  assert.ok(text.includes(PROGRESS.title) && text.includes(PROGRESS.note), 'Erfassungsgrad, ehrlich beschriftet');
  assert.ok(view.container.querySelector('[role="progressbar"]').getAttribute('aria-valuenow') > 0);
  assert.ok(text.includes(PROGRESS.next.round(2, ['Obst'])));
  assert.ok(text.includes(PROFILE.favoritesTitle) && text.includes('Naturtofu'), 'bestätigter Favorit');
  assert.ok(text.includes(PROFILE.groupsTitle));
  assert.ok(text.includes(PROFILE.exception('Sojaprodukte, Naturtofu')), 'Ausnahme bei Hülsenfrüchte');
  assert.ok(text.includes(PROFILE.unfamiliarTitle) && text.includes(PROFILE.unaskedTitle), '„Kenne ich nicht“ getrennt von „nie gefragt“');
  assert.ok(text.includes(PROFILE.practicalTitle) && text.includes(PROFILE.practicalEmpty));
  const nextButton = [...view.container.querySelectorAll('.profile-status button')][0];
  await click(nextButton);
  const practicalButton = [...view.container.querySelectorAll('.practical-panel button')][0];
  await click(practicalButton);
  assert.deepEqual(calls, ['round', 'practical']);
  await view.unmount();
});
