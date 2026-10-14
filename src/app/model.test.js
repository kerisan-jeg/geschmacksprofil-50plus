import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AUTH_ENABLED, DEFAULT_CONFIG, resolveConfig, TUTORIAL_ENABLED } from '../config.js';
import { indexCatalog } from '../logic/catalog.js';
import { LIKE } from '../logic/answers.js';
import { AUTH_COMPLETED, AUTH_STARTED, EXCLUSION_ADDED } from '../logic/events.js';
import { createAppModel, creationSteps, firstScreen, isNavVisible, screenAfterSummary, SCREENS, TABS } from './model.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const stage0 = read('../data/stage0.json');
const allergens = read('../data/allergens.json');
const index = indexCatalog(read('../data/catalog.json').cards);
const model = createAppModel({ index, stage0, allergens });

const person = { ageGroup: '60-69', participantCode: '', consent: true };
const account = { firstName: 'Anna', phoneMasked: '+41 79 *** ** 67', verifiedAt: '2026-10-14T10:00:00.000Z' };

function run(state, ...actions) {
  return actions.reduce((current, action) => model.reducer(current, action), state);
}

// Alle drei Fragen mit „nein“ beantwortet, Frage 3 noch nicht abgeschlossen.
function answered(config) {
  let state = run(model.initialState(config, { account }), { type: 'about', person });
  state = run(
    state,
    { type: 'setAnswer', questionId: 'diet', value: 'none' },
    { type: 'setAnswer', questionId: 'intolerances', value: { ...state.answers.intolerances, gate: 'no' } },
    { type: 'setAnswer', questionId: 'never', value: { ...state.answers.never, gate: 'no' } }
  );
  return state;
}

// Frage 3 abschliessen führt zur Zusammenfassung, „Stimmt so“ von dort zur ersten Karte.
const finishQuestions = (state) => run(state, { type: 'step', to: stage0.questions.length });
const toRound = (state) => run(finishQuestions(state), { type: 'confirmSummary' });

test('Registrierung: Willkommen → Vorname → Handynummer → SMS-Code → Onboarding', () => {
  assert.equal(AUTH_ENABLED, true, 'Standard: Registrierung an');
  let state = model.initialState(DEFAULT_CONFIG);
  assert.equal(state.screen, SCREENS.START);
  state = run(state, { type: 'go', screen: SCREENS.REGISTER_NAME }, { type: 'registration', changes: { firstName: 'Anna' } }, { type: 'go', screen: SCREENS.REGISTER_PHONE });
  assert.equal(state.screen, SCREENS.REGISTER_PHONE);
  state = run(state, { type: 'codeSent', request: { requestId: 'sim-1', sentAt: 0, resendAvailableAt: 30_000, e164: '+41791234567' } });
  assert.equal(state.screen, SCREENS.REGISTER_CODE);
  // Gültiger Code führt weiter
  state = run(state, { type: 'verified', account });
  assert.equal(state.screen, SCREENS.ABOUT, 'weiter zum Onboarding');
  assert.deepEqual(state.account, account);
  assert.equal(state.registration.e164, null, 'die volle Nummer bleibt nicht im Zustand');
  state = run(state, { type: 'about', person });
  assert.equal(state.screen, SCREENS.QUESTIONS);
});

test('AUTH_ENABLED = false überspringt die Registrierung und startet beim Onboarding', () => {
  const config = { ...DEFAULT_CONFIG, auth: false };
  assert.equal(firstScreen(config), SCREENS.ABOUT);
  const state = model.initialState(config);
  assert.equal(state.screen, SCREENS.ABOUT);
  assert.equal(isNavVisible(state), false);
  // Vorname dort freiwillig: mit oder ohne geht es weiter
  const withName = run(state, { type: 'about', person, firstName: 'Bruno' });
  assert.equal(withName.screen, SCREENS.QUESTIONS);
  assert.equal(withName.account.firstName, 'Bruno');
  const withoutName = run(state, { type: 'about', person, firstName: null });
  assert.equal(withoutName.screen, SCREENS.QUESTIONS);
  assert.equal(withoutName.account, null);
});

test('Wiederkehrende Person: „Willkommen zurück“, danach weiter, wo sie war', () => {
  const saved = { sessionId: 'abc', state: { ...toRound(answered(DEFAULT_CONFIG)), tab: TABS.CREATE } };
  assert.equal(saved.state.screen, SCREENS.ROUND);
  const state = model.initialState(DEFAULT_CONFIG, { account, saved });
  assert.equal(state.screen, SCREENS.WELCOME_BACK);
  assert.equal(state.account.firstName, 'Anna');
  const next = run(state, { type: 'welcomeContinue' });
  assert.equal(next.screen, SCREENS.ROUND);
  assert.ok(next.onboarding, 'Angaben sind wieder da');
  // Abmelden: alles zurück, ohne Konto
  const out = run(next, { type: 'signOut' });
  assert.equal(out.screen, SCREENS.START);
  assert.equal(out.account, null);
  assert.deepEqual(out.events, []);
  // Auch in der Zusammenfassung oder mitten in „Ändern“ geht es genau dort weiter
  for (const at of [finishQuestions(answered(DEFAULT_CONFIG)), run(finishQuestions(answered(DEFAULT_CONFIG)), { type: 'editAnswers', step: 1 })]) {
    const back = run(model.initialState(DEFAULT_CONFIG, { account, saved: { sessionId: 'abc', state: at } }), { type: 'welcomeContinue' });
    assert.deepEqual([back.screen, back.step, back.editing], [at.screen, at.step, at.editing]);
  }
});

test('Nach Frage 3 kommt die Zusammenfassung; „Ändern“ öffnet nur die passende Frage und führt zurück', () => {
  let state = finishQuestions(answered(DEFAULT_CONFIG));
  assert.equal(state.screen, SCREENS.SUMMARY, 'nurec v0.2, Kap. 2.2: erst bestätigen, dann wischen');
  assert.equal(state.onboarding.diet, 'none');
  assert.equal(isNavVisible(state), true);
  assert.deepEqual(creationSteps(state, model.roundOf(state)).map((step) => step.state), ['current', 'open', 'open'], 'gehört noch zu den Fragen');
  state = run(state, { type: 'editAnswers', step: 1 });
  assert.deepEqual([state.screen, state.step, state.editing], [SCREENS.QUESTIONS, 1, true]);
  state = run(state, { type: 'setAnswer', questionId: 'intolerances', value: { ...state.answers.intolerances, gate: 'yes', selected: ['hazelnut'] } });
  // Im Änderungsmodus führt jeder Schritt (Zurück oder Weiter) zurück zur Zusammenfassung, mit den neuen Angaben
  for (const to of [-1, 2, stage0.questions.length]) {
    const back = run(state, { type: 'step', to });
    assert.deepEqual([back.screen, back.editing], [SCREENS.SUMMARY, false], `Schritt ${to}`);
    assert.deepEqual(back.onboarding.exclusions.map((exclusion) => exclusion.value), ['hazelnut']);
  }
  const round = run(state, { type: 'step', to: stage0.questions.length }, { type: 'confirmSummary' });
  assert.equal(round.screen, SCREENS.ROUND);
  // Ohne Änderungsmodus bleibt Zurück wie gehabt
  assert.equal(run(answered(DEFAULT_CONFIG), { type: 'step', to: 1 }).screen, SCREENS.QUESTIONS);
});

test('Tutorial standardmässig aus; mit TUTORIAL_ENABLED kommt es vor der ersten Karte', () => {
  assert.equal(TUTORIAL_ENABLED, false, 'Teamentscheid 13.10.: kein Tutorial');
  assert.equal(DEFAULT_CONFIG.tutorial, TUTORIAL_ENABLED);
  assert.equal(screenAfterSummary({ ...DEFAULT_CONFIG, tutorial: false }), SCREENS.ROUND);
  assert.equal(screenAfterSummary({ ...DEFAULT_CONFIG, tutorial: true }), SCREENS.INTRO);
  assert.equal(toRound(answered(resolveConfig(''))).screen, SCREENS.ROUND);
  assert.equal(toRound(answered(resolveConfig('?tutorial=1'))).screen, SCREENS.ROUND, 'die URL schaltet es nicht ein');
  const withTutorial = toRound(answered({ ...DEFAULT_CONFIG, tutorial: true }));
  assert.equal(withTutorial.screen, SCREENS.INTRO);
  assert.equal(run(withTutorial, { type: 'startRound' }).screen, SCREENS.ROUND);
});

test('Untere Navigation erst nach Registrierung und „Über dich“, in der Runde ausgeblendet', () => {
  for (const screen of [SCREENS.START, SCREENS.REGISTER_NAME, SCREENS.REGISTER_PHONE, SCREENS.REGISTER_CODE, SCREENS.WELCOME_BACK, SCREENS.ABOUT]) {
    assert.equal(isNavVisible({ ...model.initialState(DEFAULT_CONFIG), screen }), false, screen);
  }
  const questions = answered(DEFAULT_CONFIG);
  assert.equal(isNavVisible(questions), true);
  const round = toRound(questions);
  assert.equal(round.screen, SCREENS.ROUND);
  assert.equal(isNavVisible(round), false, 'Runde: ganzer Bildschirm für Karte und Knöpfe');
  assert.equal(isNavVisible(run(round, { type: 'tab', tab: TABS.PROFILE })), true);
});

test('Nach der letzten Karte folgt der Abschluss, von dort geht es zu „Mein Profil“', () => {
  let state = toRound(answered({ ...DEFAULT_CONFIG, roundCardLimit: 4 }));
  for (const cardId of ['F01', 'F02', 'F03', 'F04']) state = run(state, { type: 'event', event: { type: 'ANSWER', cardId, response: LIKE } });
  assert.equal(state.screen, SCREENS.COMPLETE);
  assert.deepEqual(
    creationSteps(state, model.roundOf(state)).map((step) => step.state),
    ['done', 'done', 'done']
  );
  const profile = run(state, { type: 'tab', tab: TABS.PROFILE });
  assert.equal(profile.tab, TABS.PROFILE);
  assert.equal(profile.screen, SCREENS.COMPLETE, 'der Bereich „Profil erstellen“ bleibt an seiner Stelle');
});

test('Registrierung und Profiländerungen stehen im Log, ohne den Bildschirm zu wechseln', () => {
  let state = answered({ ...DEFAULT_CONFIG, roundCardLimit: 4 });
  state = run(state, { type: 'log', event: { type: AUTH_STARTED } }, { type: 'log', event: { type: AUTH_COMPLETED } });
  // Alles ausschliessen würde die Runde leeren, darf aber den Bildschirm nicht wechseln
  const everything = index.cards.filter((card) => card.stage === 1).map((card) => ({ type: 'card', value: card.id }));
  state = run(state, { type: 'log', event: { type: EXCLUSION_ADDED, source: 'profile', section: 'never', exclusions: everything } });
  assert.equal(state.screen, SCREENS.QUESTIONS);
  assert.equal(state.events.length, 3);
  // Frage 3 abschliessen: Antworten beim Wischen beginnen neu, Registrierung und Profiländerungen bleiben im Log.
  // Weil alles ausgeschlossen ist, folgt nach „Stimmt so“ direkt der Abschluss statt einer leeren Runde.
  const summary = finishQuestions(state);
  assert.equal(summary.screen, SCREENS.SUMMARY);
  assert.equal(summary.events.length, 3);
  const finished = run(summary, { type: 'confirmSummary' });
  assert.equal(finished.events.length, 3);
  assert.equal(finished.screen, SCREENS.COMPLETE);
});

test('Abschnitte zeigen den Fortschritt: Fragen erledigt, Runde läuft mit Kartenzahl aus dem Limit', () => {
  let state = toRound(answered({ ...DEFAULT_CONFIG, roundCardLimit: 6 }));
  state = run(state, { type: 'event', event: { type: 'ANSWER', cardId: 'F01', response: LIKE } });
  const [questions, round, profile] = creationSteps(state, model.roundOf(state));
  assert.equal(questions.state, 'done');
  assert.deepEqual([round.state, round.answered, round.total], ['current', 1, 6]);
  assert.equal(profile.state, 'open');
});

test('Bleibt nach den Angaben keine Karte übrig, geht es nach „Stimmt so“ direkt zum Abschluss statt in eine leere Runde', () => {
  const state = answered(DEFAULT_CONFIG);
  const all = index.cards.filter((card) => card.stage === 1).map((card) => `card:${card.id}`);
  const next = toRound(run(state, { type: 'setAnswer', questionId: 'never', value: { ...state.answers.never, gate: 'yes', selected: all } }));
  assert.equal(next.screen, SCREENS.COMPLETE);
});
