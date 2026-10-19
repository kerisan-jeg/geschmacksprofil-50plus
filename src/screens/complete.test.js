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

function render(round, nextTitles, extra = {}) {
  return renderToStaticMarkup(
    createElement(CompleteScreen, { round, endedEarly: false, firstName: 'Anna', ruleCount: 0, steps, nextTitles, onNextRound() {}, onToProfile() {}, ...extra })
  );
}

test('Abschluss von Runde 1: „Weiter mit Runde 2“ mit Ausblick auf die nächsten Karten', () => {
  const round = deriveRoundState({ index, onboarding: null, diets, events: ids.map((cardId) => ({ cardId, response: 'LIKE', round: 1 })), round: 1 });
  const nextTitles = nextRoundCards(round, config).map((card) => card.title);
  const html = render(round, nextTitles);
  assert.ok(html.includes(COMPLETE.kickerDone(1)));
  assert.ok(html.includes(COMPLETE.nextRound(2)));
  assert.ok(html.includes(COMPLETE.nextHint(nextTitles.slice(0, 3))));
  assert.ok(nextRoundCards(round, config).every((card) => card.stage === 2), 'nur Untergruppen als nächster Schritt');
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
  const initial = deriveRoundState({ index, onboarding: null, diets, round: 4 });
  const events = selectNextCards(initial, config).map((card) => ({ cardId: card.id, response: 'LIKE', round: 4 }));
  const round = deriveRoundState({ index, onboarding: null, diets, events, round: 4 });
  const html = render(round, nextRoundCards(round, config).map((card) => card.title), {
    dishes: { available: true, started: true }, onStartDishes() {}, practicalDone: false, onOpenPractical() {},
  });
  assert.ok(html.includes(COMPLETE.kickerDone(4)));
  assert.ok(html.includes(COMPLETE.leadDishes(10)));
  assert.ok(html.includes(COMPLETE.profileHint));
  assert.ok(html.includes(COMPLETE.toProfile));
  assert.ok(!html.includes('Weiter mit Runde'));
  assert.ok(!html.includes('Als Nächstes zum Beispiel'));
  assert.ok(!html.includes('Du hast alle Karten beantwortet.'));
  assert.ok(!html.includes('Gerichte bewerten'));
  assert.ok(!html.includes('Weitere Gerichte bewerten'));
  assert.ok(html.includes(COMPLETE.startPractical), 'Alltag bleibt nach Runde 4 freiwillig möglich');
});

test('Abschluss: Rundenübersicht mit Status; „Runde fortsetzen“ nur für eine begonnene Runde', async () => {
  const { roundOverview } = await import('../logic/rounds.js');
  const onboarding = { diet: null, exclusions: [], cardLabels: {} };
  const events = [{ cardId: 'F01', response: 'LIKE', round: 1 }, { type: 'QUESTION_ABORTED', cardId: 'F02', round: 1 }];
  const round = deriveRoundState({ index, onboarding, diets, events, round: 1 });
  const rounds = roundOverview({ index, onboarding, diets, events, config });
  const html = render(round, ['Fisch'], { endedEarly: true, rounds, onResumeRound() {} });
  assert.ok(html.includes('Deine Runden'));
  assert.ok(html.includes('Begonnen · 1 von 10 Karten'));
  assert.ok(!html.includes('Abgeschlossen'), 'eine vorzeitig beendete Runde ist nie „Abgeschlossen“');
  assert.ok(html.includes('Runde 1 fortsetzen'));
  assert.ok(html.includes('Startet nach Runde 2'), 'Runde 3 gesperrt, solange Runde 2 offen ist');
});
