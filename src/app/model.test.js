import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG, resolveConfig, TUTORIAL_ENABLED } from '../config.js';
import { indexCatalog } from '../logic/catalog.js';
import { LIKE } from '../logic/answers.js';
import { createAppModel, creationSteps, isNavVisible, screenAfterQuestions, SCREENS, TABS } from './model.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const stage0 = read('../data/stage0.json');
const allergens = read('../data/allergens.json');
const index = indexCatalog(read('../data/catalog.json').cards);
const model = createAppModel({ index, stage0, allergens });

const person = { firstName: 'Anna', ageGroup: '60-69', participantCode: '', consent: true };

function run(state, ...actions) {
  return actions.reduce((current, action) => model.reducer(current, action), state);
}

// Bis zum Ende von Frage 3: alle drei Fragen mit „nein“ beantwortet, noch nicht abgeschlossen.
function answered(config) {
  let state = run(model.initialState(config), { type: 'go', screen: SCREENS.LOGIN }, { type: 'login', person });
  state = run(
    state,
    { type: 'setAnswer', questionId: 'diet', value: 'none' },
    { type: 'setAnswer', questionId: 'intolerances', value: { ...state.answers.intolerances, gate: 'no' } },
    { type: 'setAnswer', questionId: 'never', value: { ...state.answers.never, gate: 'no' } }
  );
  return state;
}

const finishQuestions = (state) => run(state, { type: 'step', to: stage0.questions.length });

test('Tutorial standardmässig aus; mit TUTORIAL_ENABLED kommt es vor der ersten Karte', () => {
  assert.equal(TUTORIAL_ENABLED, false, 'Teamentscheid 13.10.: kein Tutorial');
  assert.equal(DEFAULT_CONFIG.tutorial, TUTORIAL_ENABLED);
  assert.equal(screenAfterQuestions({ ...DEFAULT_CONFIG, tutorial: false }), SCREENS.ROUND);
  assert.equal(screenAfterQuestions({ ...DEFAULT_CONFIG, tutorial: true }), SCREENS.INTRO);
  assert.equal(finishQuestions(answered(resolveConfig(''))).screen, SCREENS.ROUND);
  assert.equal(finishQuestions(answered(resolveConfig('?tutorial=1'))).screen, SCREENS.ROUND, 'die URL schaltet es nicht ein');
  // Eingeschaltet über die Konfiguration (Pilot-Vergleich)
  const withTutorial = finishQuestions(answered({ ...DEFAULT_CONFIG, tutorial: true }));
  assert.equal(withTutorial.screen, SCREENS.INTRO);
  assert.equal(run(withTutorial, { type: 'startRound' }).screen, SCREENS.ROUND);
});

test('Untere Navigation erst nach der Anmeldung, in der Runde ausgeblendet', () => {
  const start = model.initialState(DEFAULT_CONFIG);
  assert.equal(isNavVisible(start), false);
  assert.equal(isNavVisible({ ...start, screen: SCREENS.LOGIN }), false);
  const questions = answered(DEFAULT_CONFIG);
  assert.equal(isNavVisible(questions), true);
  const round = finishQuestions(questions);
  assert.equal(round.screen, SCREENS.ROUND);
  assert.equal(isNavVisible(round), false, 'Runde: ganzer Bildschirm für Karte und Knöpfe');
  assert.equal(isNavVisible(run(round, { type: 'tab', tab: TABS.PROFILE })), true);
});

test('Nach der letzten Karte folgt der Abschluss, von dort geht es zu „Mein Profil“', () => {
  let state = finishQuestions(answered({ ...DEFAULT_CONFIG, roundCardLimit: 4 }));
  for (const cardId of ['F01', 'F02', 'F03', 'F04']) state = run(state, { type: 'event', event: { cardId, response: LIKE } });
  assert.equal(state.screen, SCREENS.COMPLETE);
  assert.deepEqual(
    creationSteps(state, model.roundOf(state)).map((step) => step.state),
    ['done', 'done', 'done']
  );
  const profile = run(state, { type: 'tab', tab: TABS.PROFILE });
  assert.equal(profile.tab, TABS.PROFILE);
  assert.equal(profile.screen, SCREENS.COMPLETE, 'der Bereich „Profil erstellen“ bleibt an seiner Stelle');
});

test('Abschnitte zeigen den Fortschritt: Fragen erledigt, Runde läuft mit Kartenzahl aus dem Limit', () => {
  let state = finishQuestions(answered({ ...DEFAULT_CONFIG, roundCardLimit: 6 }));
  state = run(state, { type: 'event', event: { cardId: 'F01', response: LIKE } });
  const [questions, round, profile] = creationSteps(state, model.roundOf(state));
  assert.equal(questions.state, 'done');
  assert.deepEqual([round.state, round.answered, round.total], ['current', 1, 6]);
  assert.equal(profile.state, 'open');
});

test('Bleibt nach den Angaben keine Karte übrig, geht es direkt zum Abschluss statt in eine leere Runde', () => {
  const state = answered(DEFAULT_CONFIG);
  const all = index.cards.filter((card) => card.stage === 1).map((card) => `card:${card.id}`);
  const next = finishQuestions(run(state, { type: 'setAnswer', questionId: 'never', value: { ...state.answers.never, gate: 'yes', selected: all } }));
  assert.equal(next.screen, SCREENS.COMPLETE);
});
