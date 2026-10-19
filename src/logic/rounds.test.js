// Rundenübersicht (Dozentenfeedback 19.10.2026, Verbesserung 7): Status, Sperre, Fortsetzen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexCatalog } from './catalog.js';
import { LIKE } from './answers.js';
import { deriveRoundState, nextCard, selectNextCards } from './engine.js';
import { NAVIGATION } from './events.js';
import { roundOverview } from './rounds.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const { diets } = read('../data/stage0.json');
const onboarding = { diet: null, exclusions: [], cardLabels: {} };
const config = { roundCardLimit: 4 };
const state = (events, round) => deriveRoundState({ index, onboarding, diets, events, round });
const overview = (events) => roundOverview({ index, onboarding, diets, events, config });
const statuses = (events) => overview(events).map((entry) => [entry.status, entry.locked]);
const answerIn = (events, round) => [...events, { cardId: nextCard(state(events, round), config).id, response: LIKE, round }];

test('Zu Beginn: Runde 1 noch offen, Runden 2 bis 4 gesperrt', () => {
  assert.deepEqual(statuses([]), [['open', false], ['open', true], ['open', true], ['open', true]]);
});

test('Runde vorzeitig verlassen: „Begonnen“, nie „Abgeschlossen“; die nächste Runde ist frei; Fortsetzen möglich', () => {
  let events = answerIn([], 1);
  events = [...events, { type: 'QUESTION_ABORTED', cardId: nextCard(state(events, 1), config).id, round: 1 }];
  const [first, second, third] = overview(events);
  assert.equal(first.status, 'started');
  assert.deepEqual([first.answered, first.total], [1, 4]);
  assert.equal(first.canResume, true);
  assert.deepEqual([second.status, second.locked], ['open', false], 'nach „Runde beenden“ freigegeben (Teamentscheid AP1)');
  assert.equal(third.locked, true, 'Runde 3 gesperrt, solange Runde 2 offen ist');
});

test('Fortsetzen zeigt keine bereits beantworteten Karten; nach dem Limit „Abgeschlossen“', () => {
  let events = answerIn(answerIn([], 1), 1);
  const answered = events.map((event) => event.cardId);
  assert.ok(selectNextCards(state(events, 1), config).every((card) => !answered.includes(card.id)));
  events = answerIn(answerIn(events, 1), 1);
  assert.equal(overview(events)[0].status, 'completed');
  assert.equal(overview(events)[0].canResume, false);
});

test('Sobald Runde 2 eine Antwort hat, lässt sich Runde 1 nicht mehr fortsetzen (bleibt „Begonnen“)', () => {
  let events = answerIn([], 1);
  events = answerIn(events, 2);
  const [first, second] = overview(events);
  assert.deepEqual([first.status, first.canResume], ['started', false]);
  assert.deepEqual([second.status, second.canResume], ['started', true]);
});

test('Navigationsereignisse ändern weder Status noch Antworten', () => {
  const events = answerIn([], 1);
  const withNavigation = [...events, { type: NAVIGATION, action: 'overview_open', round: 1 }, { type: NAVIGATION, action: 'overview_close', round: 1 }];
  assert.deepEqual(overview(withNavigation), overview(events));
  assert.deepEqual(state(withNavigation, 1).sequence, state(events, 1).sequence);
});

test('Runde ohne passende Karte gilt als abgeschlossen, sobald die Runden davor nicht mehr offen sind', () => {
  const vegan = { diet: 'vegan', exclusions: ['milk_protein', 'lactose', 'wheat', 'celery', 'soy', 'egg', 'mustard', 'peanut', 'crustaceans', 'fish'].map((value) => ({ type: 'allergen', value })), cardLabels: {} };
  const dishesLeft = selectNextCards(deriveRoundState({ index, onboarding: vegan, diets, events: [], round: 4 }), config).length;
  const rounds = roundOverview({ index, onboarding: vegan, diets, events: [], config });
  if (dishesLeft === 0) {
    assert.deepEqual([rounds[3].status, rounds[3].locked], ['open', true], 'gesperrt, solange Runde 3 offen ist');
  }
  assert.ok(rounds.every((entry) => ['open', 'started', 'completed'].includes(entry.status)), 'nur die drei Status');
});
