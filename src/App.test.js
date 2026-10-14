// Einstiegsablauf nach dem Teamentscheid vom 13.10. (ursprünglich von Arben, an das App-Modell in
// src/app/model.js angepasst): Frage 2 ohne „Unsicher“, nach Frage 3 direkt die erste Karte,
// alte ?tutorial-URLs ändern daran nichts. Statt „Anmelden“ steht seit der Registrierung „Über dich“.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { indexCatalog } from './logic/catalog.js';
import { deriveRoundState, nextCard } from './logic/engine.js';
import { resolveConfig } from './config.js';
import { createAppModel, SCREENS } from './app/model.js';
import QuestionnaireScreen from './screens/QuestionnaireScreen.jsx';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const definition = read('./data/stage0.json');
const allergens = read('./data/allergens.json');
const index = indexCatalog(read('./data/catalog.json').cards);
const { initialState, reducer } = createAppModel({ index, stage0: definition, allergens });

function answer(state, questionId, changes) {
  const value = typeof changes === 'string' ? changes : { ...state.answers[questionId], ...changes };
  return reducer(state, { type: 'setAnswer', questionId, value });
}

const account = { firstName: 'Anna', phoneMasked: '+41 79 *** ** 67', verifiedAt: null };

function questionnaire(search = '') {
  let state = reducer(initialState(resolveConfig(search), { account }), { type: 'about', person: { ageGroup: '60-69', participantCode: '', consent: true } });
  state = answer(state, 'diet', 'none');
  state = reducer(state, { type: 'step', to: 1 });
  state = answer(state, 'intolerances', { gate: 'no' });
  state = reducer(state, { type: 'step', to: 2 });
  return answer(state, 'never', { gate: 'no' });
}

const roundOf = (state) => deriveRoundState({ index, onboarding: state.onboarding, diets: definition.diets, events: state.events });

test('Frage 2 rendert genau zwei Hauptoptionen; Frage 3 zeigt die korrigierte Überschrift', () => {
  const props = {
    questions: definition.questions,
    answers: questionnaire().answers,
    onChange() {},
    onStep() {},
  };
  const question2 = renderToStaticMarkup(createElement(QuestionnaireScreen, { ...props, step: 1 }));
  assert.equal((question2.match(/type="radio"/g) ?? []).length, 2);
  assert.ok(question2.includes('Ja'));
  assert.ok(question2.includes('Keine bekannt'));
  assert.ok(!question2.includes('Unsicher'));
  const question3 = renderToStaticMarkup(createElement(QuestionnaireScreen, { ...props, step: 2 }));
  assert.ok(question3.includes('Gibt es etwas Weiteres, das wir dir nie vorschlagen dürfen?'));
  assert.ok(question3.includes('Erste Karte zeigen'));
});

test('Nach Frage 3 erscheint direkt die erste echte Karte, auch mit alten Tutorial-URLs', () => {
  for (const search of ['', '?tutorial=0', '?tutorial=1']) {
    const state = reducer(questionnaire(search), { type: 'step', to: 3 });
    assert.equal(state.screen, SCREENS.ROUND);
    assert.equal(nextCard(roundOf(state), state.config).id, 'F01');
    assert.deepEqual(state.events, []);
    assert.equal(state.endedEarly, false);
  }
});

test('Der direkte Rundenstart übernimmt Ernährungsweise, Allergien und weitere Ausschlüsse', () => {
  let state = questionnaire();
  state = answer(state, 'diet', 'vegetarian');
  state = answer(state, 'intolerances', { gate: 'yes', selected: ['hazelnut'] });
  state = answer(state, 'never', { gate: 'yes', selected: ['card:F03'] });
  state = reducer(state, { type: 'step', to: 3 });
  assert.equal(state.screen, SCREENS.ROUND);
  assert.equal(state.onboarding.diet, 'vegetarian');
  assert.deepEqual(state.onboarding.exclusions.map(({ type, value }) => [type, value]), [
    ['allergen', 'hazelnut'],
    ['card', 'F03'],
  ]);
  assert.equal(nextCard(roundOf(state), state.config).id, 'F04');
});

test('Zurück führt von Frage 3 über Frage 2 und Frage 1 zu „Über dich“ und behält die Antworten', () => {
  let state = questionnaire();
  const answers = state.answers;
  for (const to of [1, 0]) {
    state = reducer(state, { type: 'step', to });
    assert.equal(state.screen, SCREENS.QUESTIONS);
    assert.equal(state.step, to);
    assert.deepEqual(state.answers, answers);
  }
  state = reducer(state, { type: 'step', to: -1 });
  assert.equal(state.screen, SCREENS.ABOUT);
  assert.deepEqual(state.answers, answers);
});

test('Sind alle Karten ausgeschlossen, erscheint der Abschluss statt eines leeren Screens', () => {
  let state = answer(questionnaire(), 'never', {
    gate: 'yes',
    selected: index.cards.filter((card) => card.stage === 1).map((card) => `card:${card.id}`),
  });
  state = reducer(state, { type: 'step', to: 3 });
  assert.equal(state.screen, SCREENS.COMPLETE);
  assert.equal(nextCard(roundOf(state), state.config), null);
});
