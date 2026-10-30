// Befragung und Abschlussbestätigung im Ablauf (29.10.2026): Profil oder Abschluss → Befragung → Abschluss
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG } from '../config.js';
import { indexCatalog } from '../logic/catalog.js';
import { LIKE } from '../logic/answers.js';
import { canStartSurvey, createAppModel, creationSteps, isNavVisible, SCREENS, TABS } from './model.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const stage0 = read('../data/stage0.json');
const model = createAppModel({ index: indexCatalog(read('../data/catalog.json').cards), stage0, allergens: read('../data/allergens.json') });
const run = (state, ...actions) => actions.reduce((current, action) => model.reducer(current, action), state);
const person = { ageGroup: '60-69', participantCode: '', consent: true };

// Bis zum Abschluss von Runde 1 (Limit 4)
function afterRound1() {
  let state = run(model.initialState({ ...DEFAULT_CONFIG, roundCardLimit: 4 }, { account: { firstName: 'Anna' } }), { type: 'about', person }, { type: 'setAnswer', questionId: 'diet', value: 'none' }, { type: 'step', to: stage0.questions.length }, { type: 'confirmSummary' });
  assert.equal(state.screen, SCREENS.ROUND);
  for (const cardId of ['F01', 'F02', 'F03', 'F04']) state = run(state, { type: 'event', event: { type: 'ANSWER', cardId, response: LIKE, round: 1 } });
  assert.equal(state.screen, SCREENS.COMPLETE);
  return state;
}

test('Befragung erst nach einer abgeschlossenen oder beendeten Runde, nie mitten im Wischen', () => {
  let state = run(model.initialState(DEFAULT_CONFIG, { account: { firstName: 'Anna' } }), { type: 'about', person }, { type: 'setAnswer', questionId: 'diet', value: 'none' }, { type: 'step', to: stage0.questions.length }, { type: 'confirmSummary' });
  assert.equal(canStartSurvey(state), false);
  assert.equal(run(state, { type: 'survey' }), state, 'in der Runde nicht möglich');
  state = afterRound1();
  assert.equal(canStartSurvey(state), true);
  assert.equal(canStartSurvey(run(state, { type: 'end' })), true, 'auch nach „Runde beenden“');
});

test('Profil → Befragung (ohne Leiste) → Abschlussbestätigung (mit Leiste); Zurück führt zum Profil', () => {
  const complete = afterRound1();
  const survey = run(complete, { type: 'tab', tab: TABS.PROFILE }, { type: 'survey' });
  assert.deepEqual([survey.screen, survey.tab, survey.surveyDone], [SCREENS.SURVEY, TABS.CREATE, false]);
  assert.equal(isNavVisible(survey), false, 'die Befragung hat nur einen Weg nach vorn');
  assert.equal(creationSteps(survey, model.roundOf(survey))[1].state, 'done', 'die Runde gilt weiter als erledigt');
  const back = run(survey, { type: 'surveyCancel' });
  assert.deepEqual([back.screen, back.tab], [SCREENS.COMPLETE, TABS.PROFILE]);
  const finish = run(survey, { type: 'surveySubmitted' });
  assert.deepEqual([finish.screen, finish.surveyDone], [SCREENS.FINISH, true]);
  assert.equal(isNavVisible(finish), true, 'vom Abschluss aus bleibt das Profil erreichbar');
  assert.equal(run(finish, { type: 'survey' }), finish, 'nur einmal');
  assert.equal(run(complete, { type: 'surveySubmitted' }), complete, 'Absenden nur aus der Befragung');
});

test('Gespeicherter Stand mit abgeschickter Befragung kommt bei der Abschlussbestätigung wieder an; Abmelden setzt zurück', () => {
  const finish = run(afterRound1(), { type: 'survey' }, { type: 'surveySubmitted' });
  const saved = { sessionId: 'alt', state: { ...finish } };
  const restored = model.initialState(DEFAULT_CONFIG, { account: { firstName: 'Anna' }, saved });
  assert.equal(restored.screen, SCREENS.WELCOME_BACK);
  const resumed = run(restored, { type: 'welcomeContinue' });
  assert.deepEqual([resumed.screen, resumed.surveyDone], [SCREENS.FINISH, true]);
  const fresh = run(resumed, { type: 'signOut' });
  assert.deepEqual([fresh.screen, fresh.surveyDone], [SCREENS.START, false]);
});
