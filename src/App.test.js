// Einstiegsablauf (ursprünglich von Arben, Teamentscheid vom 13.10., an das App-Modell in src/app/model.js
// angepasst): Frage 2 ohne „Unsicher“, alte ?tutorial-URLs ändern nichts. Statt „Anmelden“ steht seit der
// Registrierung „Über dich“. Nach Frage 3 steht wieder eine kurze Zusammenfassung (nurec v0.2, Kap. 2.2:
// die Person bestätigt oder korrigiert jede Regel); nach „Stimmt so“ folgt direkt die erste Karte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { indexCatalog } from './logic/catalog.js';
import { deriveRoundState, nextCard } from './logic/engine.js';
import { summarySections } from './logic/profile.js';
import { resolveConfig } from './config.js';
import { createAppModel, creationSteps, SCREENS } from './app/model.js';
import QuestionnaireScreen from './screens/QuestionnaireScreen.jsx';
import SummaryScreen from './screens/SummaryScreen.jsx';

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
const finish = (state) => reducer(state, { type: 'step', to: 3 });
const confirm = (state) => reducer(state, { type: 'confirmSummary' });

function renderSummary(state) {
  const sections = summarySections(roundOf(state), { onboarding: state.onboarding, diets: definition.diets, allergens, index });
  const props = { sections, noCards: false, firstName: 'Anna', steps: creationSteps(state, roundOf(state)), onConfirm() {}, onEdit() {}, onOpenProfile() {} };
  return { sections, html: renderToStaticMarkup(createElement(SummaryScreen, props)) };
}

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
  assert.ok(question3.includes('Weiter'), 'danach folgt die Zusammenfassung, noch keine Karte');
});

test('Nach Frage 3 erscheint die Zusammenfassung, nach „Stimmt so“ direkt die erste echte Karte, auch mit alten Tutorial-URLs', () => {
  for (const search of ['', '?tutorial=0', '?tutorial=1']) {
    const summary = finish(questionnaire(search));
    assert.equal(summary.screen, SCREENS.SUMMARY);
    const state = confirm(summary);
    assert.equal(state.screen, SCREENS.ROUND);
    assert.equal(nextCard(roundOf(state), state.config).id, 'F01');
    assert.deepEqual(state.events, []);
    assert.equal(state.endedEarly, false);
  }
});

test('Die Zusammenfassung zeigt jede feste Regel mit „Ändern“; der Rundenstart übernimmt sie', () => {
  let state = questionnaire();
  state = answer(state, 'diet', 'vegetarian');
  state = answer(state, 'intolerances', { gate: 'yes', selected: ['hazelnut'] });
  state = answer(state, 'never', { gate: 'yes', selected: ['card:F03'] });
  state = finish(state);
  assert.equal(state.screen, SCREENS.SUMMARY);
  const { sections, html } = renderSummary(state);
  assert.ok(html.includes('Stimmt das so?'));
  assert.ok(html.includes('Diese Zutaten, Lebensmittel und Produkte schlagen wir dir nie vor'));
  const rules = sections.flatMap((section) => section.items.map((item) => item.label));
  assert.equal(rules.length, 3);
  for (const rule of rules) assert.ok(html.includes(rule), rule);
  assert.equal((html.match(/aria-label="[^"]* ändern"/g) ?? []).length, 3, 'ein „Ändern“ je Frage');
  assert.ok(html.includes('Stimmt so'));

  state = confirm(state);
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

test('Sind alle Karten ausgeschlossen, erscheint nach der Zusammenfassung der Abschluss statt eines leeren Screens', () => {
  let state = answer(questionnaire(), 'never', {
    gate: 'yes',
    selected: index.cards.filter((card) => card.stage === 1).map((card) => `card:${card.id}`),
  });
  state = finish(state);
  assert.equal(state.screen, SCREENS.SUMMARY);
  state = confirm(state);
  assert.equal(state.screen, SCREENS.COMPLETE);
  assert.equal(nextCard(roundOf(state), state.config), null);
});
