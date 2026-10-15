import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { indexCatalog } from '../logic/catalog.js';
import { deriveRoundState, nextRoundCards, selectNextCards } from '../logic/engine.js';
import { COMPLETE } from '../labels.js';
import CompleteScreen from './CompleteScreen.jsx';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const { diets } = read('../data/stage0.json');
const config = { roundCardLimit: 10 };
const ids = ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10'];
const steps = [
  { id: 'questions', state: 'done' },
  { id: 'round', state: 'done', answered: 10, total: 10, number: 1 },
  { id: 'profile', state: 'done' },
];

function render(round, nextTitles) {
  return renderToStaticMarkup(
    createElement(CompleteScreen, { round, endedEarly: false, firstName: 'Anna', ruleCount: 0, steps, nextTitles, onNextRound() {}, onToProfile() {} })
  );
}

test('Abschluss von Runde 1: „Weiter mit Runde 2“ mit Ausblick auf die nächsten Karten', () => {
  const round = deriveRoundState({ index, onboarding: null, diets, events: ids.map((cardId) => ({ cardId, response: 'LIKE', round: 1 })), round: 1 });
  const nextTitles = nextRoundCards(round, config).map((card) => card.title);
  const html = render(round, nextTitles);
  assert.ok(html.includes(COMPLETE.kickerDone(1)));
  assert.ok(html.includes(COMPLETE.nextRound(2)));
  assert.ok(html.includes(COMPLETE.nextHint(nextTitles.slice(0, 3))));
  assert.ok(html.includes('Gegartes Gemüse'), 'die übrigen Gruppen kommen zuerst');
  assert.ok(html.includes(COMPLETE.toProfile));
  assert.ok(html.includes(COMPLETE.leadDone(10)));
});

test('Sind alle Karten beantwortet, gibt es keine weitere Runde, nur „Mein Profil ansehen“', () => {
  const round = deriveRoundState({ index, onboarding: null, diets, events: ids.map((cardId) => ({ cardId, response: 'LIKE', round: 3 })), round: 3 });
  const html = render(round, []);
  assert.ok(!html.includes('Weiter mit Runde'));
  assert.ok(html.includes(COMPLETE.leadComplete));
  assert.ok(html.includes(COMPLETE.kickerDone(3)));
  assert.ok(html.includes(COMPLETE.toProfile));
});

test('Nach Runde 4 führt der Abschluss trotz offener Karten nur noch zum Profil', () => {
  const initial = deriveRoundState({ index, onboarding: null, diets });
  const events = selectNextCards(initial, { roundCardLimit: 100 }).slice(0, 40)
    .map((card, i) => ({ cardId: card.id, response: 'LIKE', round: 1 + Math.floor(i / 10) }));
  const round = deriveRoundState({ index, onboarding: null, diets, events, round: 4 });
  const html = render(round, nextRoundCards(round, config).map((card) => card.title));
  assert.ok(html.includes(COMPLETE.kickerDone(4)));
  assert.ok(html.includes(COMPLETE.leadComplete));
  assert.ok(html.includes(COMPLETE.profileHint));
  assert.ok(html.includes(COMPLETE.toProfile));
  assert.ok(!html.includes('Weiter mit Runde'));
  assert.ok(!html.includes('Als Nächstes zum Beispiel'));
  assert.ok(!html.includes('Du hast alle Karten beantwortet.'));
});
