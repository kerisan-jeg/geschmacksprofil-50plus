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

async function setup({ rules = onboarding, sessionEvents = events } = {}) {
  const calls = [];
  const round = deriveRoundState({ index, onboarding: rules, diets: stage0.diets, events: sessionEvents });
  const onChange = { confirmPrediction: (...args) => calls.push(args), rating() {}, addExclusions() {}, removeExclusions() {}, diet() {} };
  const view = await render(
    h(ProfileScreen, { round, onboarding: rules, account: null, index, allergens, foods: [], dietOptions, steps: [], canSignOut: false, onCreate() {}, onRestart() {}, onSignOut() {}, onChange })
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
  await click(view.container.querySelector('[aria-labelledby="insights-title"] > summary'));
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

test('Ohne Meeresfrüchte nennt auch das Profil die bewertete Gruppe, Vermutungen und Bewertung nur Fisch', async () => {
  const rules = { ...onboarding, exclusions: [{ type: 'animalOrigin', value: 'seafood', source: 'onboarding', origin: 'never' }] };
  const view = await setup({ rules, sessionEvents: [{ cardId: 'F02', response: 'LIKE', round: 1 }] });
  await click(view.container.querySelector('[aria-labelledby="group-answers-LIKE"] > summary'));
  const group = view.container.querySelector('[aria-labelledby="group-answers-LIKE"] .taste-row');
  assert.equal(group.querySelector('.taste-title').textContent, 'Fisch');
  assert.ok(!group.getAttribute('aria-label').includes('Meeresfrüchte'));
  const reasons = [...view.container.querySelectorAll('.is-derived .taste-reason')].map((node) => node.textContent);
  assert.ok(reasons.includes(PROFILE.derived.reason('Fisch', 'LIKE')));
  assert.ok(reasons.every((reason) => !reason.includes('Meeresfrüchte')));
  await click(group);
  assert.equal(document.querySelector('[role="dialog"] h2').textContent, 'Fisch');
  await view.unmount();
});

test('Bewertete Gerichte sind als Gericht gekennzeichnet; keine zusätzliche Runde nach Runde 4', async () => {
  const view = await setup({ sessionEvents: [{ cardId: 'F01', response: 'LIKE', round: 1 }, { cardId: 'D05', response: 'PREFER', round: 4 }] });
  const dishes = view.container.querySelector('[aria-labelledby="group-answers-PREFER"]');
  assert.ok(dishes.textContent.includes('Rösti mit Spiegelei'));
  assert.ok(dishes.querySelector('.taste-reason').textContent.includes(PROFILE.answerKinds.dish));
  assert.ok(!view.container.querySelector('[aria-labelledby="group-answers-LIKE"]').textContent.includes('Rösti mit Spiegelei'));
  assert.ok([...view.container.querySelectorAll('button')].every((button) => !button.textContent.includes('Gerichte bewerten')));
  await view.unmount();
});

test('Dashboard: Profilstand, Antwortkategorien, Gruppen, Ausnahmen, Offenes und Alltag bleiben zugänglich', async () => {
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
  assert.ok(text.includes('Naturtofu'), 'bestätigter Favorit bleibt erreichbar');
  assert.ok(text.includes(PROFILE.answerKinds.group));
  assert.ok(text.includes(PROFILE.exception('Sojaprodukte, Naturtofu')), 'Ausnahme bei Hülsenfrüchte');
  assert.ok(text.includes('Kenne ich nicht') && text.includes(PROFILE.unaskedTitle), '„Kenne ich nicht“ getrennt von „nie gefragt“');
  assert.ok(text.includes(PROFILE.practicalTitle) && text.includes(PROFILE.practicalEmpty));
  const nextButton = [...view.container.querySelectorAll('.profile-status button')][0];
  await click(nextButton);
  await click(view.container.querySelector('.practical-panel > summary'));
  const practicalButton = [...view.container.querySelectorAll('.practical-panel button')][0];
  await click(practicalButton);
  assert.deepEqual(calls, ['round', 'practical']);
  await view.unmount();
});

test('Profil startet kompakt: alle Detailbereiche geschlossen, Zähler und Balken stimmen, Kategorien öffnen unabhängig', async () => {
  const view = await setup({ sessionEvents: [
    { cardId: 'F01', response: 'LIKE' },
    { cardId: 'F03', response: 'PREFER' },
    { cardId: 'F05', response: 'DISLIKE' },
    { cardId: 'D01', response: 'UNFAMILIAR', round: 4 },
    { cardId: 'F09', response: 'INTOLERANT' },
  ] });
  assert.ok([...view.container.querySelectorAll('.profile-disclosure')].every((details) => !details.open));
  assert.equal(view.container.querySelector('.answer-total strong').textContent, '4');
  const categories = [...view.container.querySelectorAll('.answer-distribution details')];
  assert.equal(categories.length, 4);
  for (const details of categories) {
    assert.equal(details.querySelector('.group-count').textContent, '1');
    assert.equal(details.querySelector('.profile-answer-fill').style.width, '25%');
  }
  await click(categories[0].querySelector('summary'));
  assert.equal(categories[0].open, true);
  assert.equal(categories[1].open, false);
  await click(categories[1].querySelector('summary'));
  assert.equal(categories[0].open, true);
  await click(categories[0].querySelector('summary'));
  assert.equal(categories[0].open, false);
  const unknown = categories.at(-1);
  assert.ok(unknown.textContent.includes('Pizza Margherita'));
  assert.ok(!categories[2].textContent.includes('Pizza Margherita'));
  await view.unmount();
});

test('Ohne Antworten zeigen alle Kategorien null und einen verständlichen Leerzustand', async () => {
  const view = await setup({ sessionEvents: [] });
  assert.equal(view.container.querySelector('.answer-total strong').textContent, '0');
  assert.ok(view.container.textContent.includes(PROFILE.tasteEmpty));
  for (const details of view.container.querySelectorAll('.answer-distribution details')) {
    assert.equal(details.querySelector('.group-count').textContent, '0');
    assert.equal(details.querySelector('.profile-answer-fill').style.width, '0%');
    await click(details.querySelector('summary'));
    assert.ok(details.textContent.includes(PROFILE.answerEmpty));
  }
  await view.unmount();
});

test('Geänderte und entfernte Antworten aktualisieren Übersicht und Listen ohne erneutes Öffnen des Profils', async () => {
  const { useState } = await import('react');
  function Harness() {
    const [sessionEvents, setEvents] = useState([{ cardId: 'F01', response: 'LIKE' }]);
    const round = deriveRoundState({ index, onboarding, diets: stage0.diets, events: sessionEvents });
    return h(ProfileScreen, {
      round, onboarding, account: null, index, allergens, foods: [], dietOptions, steps: [],
      onChange: { rating: (cardId, rating) => setEvents((current) => [...current, { type: 'RATING_CHANGED', source: 'profile', cardId, rating }]) },
    });
  }
  const view = await render(h(Harness));
  const category = (rating) => view.container.querySelector(`[aria-labelledby="group-answers-${rating}"]`);
  await click(category('LIKE').querySelector('summary'));
  await click(category('LIKE').querySelector('.taste-row'));
  await click([...document.querySelectorAll('[role="radio"]')].at(-1));
  assert.equal(category('LIKE').querySelector('.group-count').textContent, '0');
  assert.equal(category('PREFER').querySelector('.group-count').textContent, '1');
  assert.equal(category('LIKE').querySelector('.taste-row'), null);
  await click(category('PREFER').querySelector('summary'));
  await click(category('PREFER').querySelector('.taste-row'));
  await click([...document.querySelectorAll('button')].find((button) => button.textContent === PROFILE.ratingRemove));
  assert.equal(view.container.querySelector('.answer-total strong').textContent, '0');
  assert.equal(category('PREFER').querySelector('.group-count').textContent, '0');
  await view.unmount();
});
