import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AUTH_ENABLED, DEFAULT_CONFIG, resolveConfig, TUTORIAL_ENABLED } from '../config.js';
import { indexCatalog } from '../logic/catalog.js';
import { LIKE } from '../logic/answers.js';
import { creationProgress, nextCard } from '../logic/engine.js';
import { AUTH_COMPLETED, AUTH_STARTED, EXCLUSION_ADDED } from '../logic/events.js';
import { createAppModel, creationSteps, firstScreen, isNavVisible, screenAfterSummary, SCREENS, TABS } from './model.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const stage0 = read('../data/stage0.json');
const allergens = read('../data/allergens.json');
const index = indexCatalog(read('../data/catalog.json').cards);
const model = createAppModel({ index, stage0, allergens });

const person = { ageGroup: '60-69', participantCode: '', consent: true };
const account = { firstName: 'Anna' };

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

function finishRound(state) {
  for (let i = 0; state.screen === SCREENS.ROUND && i < 100; i += 1) {
    const card = nextCard(model.roundOf(state), state.config);
    assert.ok(card);
    state = run(state, { type: 'event', event: { type: 'ANSWER', cardId: card.id, stage: card.stage, response: LIKE, round: state.roundNumber } });
  }
  assert.equal(state.screen, SCREENS.COMPLETE);
  return state;
}

test('Anmeldung: Willkommen → Vorname → Onboarding (keine Handynummer, kein SMS-Code seit dem 28.10.2026)', () => {
  assert.equal(AUTH_ENABLED, true, 'Standard: Anmeldung an');
  let state = model.initialState(DEFAULT_CONFIG);
  assert.equal(state.screen, SCREENS.START);
  assert.ok(!('REGISTER_PHONE' in SCREENS) && !('REGISTER_CODE' in SCREENS) && !('PRACTICAL' in SCREENS));
  state = run(state, { type: 'go', screen: SCREENS.REGISTER_NAME }, { type: 'registration', changes: { firstName: 'Anna' } });
  assert.equal(state.screen, SCREENS.REGISTER_NAME);
  state = run(state, { type: 'register', firstName: 'Anna' });
  assert.equal(state.screen, SCREENS.ABOUT, 'weiter zum Onboarding');
  assert.deepEqual(state.account, { firstName: 'Anna' });
  assert.deepEqual(state.registration, { firstName: '' }, 'die Eingabe bleibt nicht im Zustand');
  state = run(state, { type: 'about', person });
  assert.equal(state.screen, SCREENS.QUESTIONS);
  // Gespeicherte Stände alter Bildschirme (Handynummer, SMS-Code, Alltag) laufen an der nächsten sinnvollen Stelle weiter
  const legacy = model.initialState(DEFAULT_CONFIG, { account, saved: { sessionId: 'alt', state: { ...model.initialState(DEFAULT_CONFIG), screen: 'register-code', practicalFrom: { screen: 'complete' } } } });
  assert.equal(legacy.resume.screen, SCREENS.REGISTER_NAME);
  assert.ok(!('practicalFrom' in legacy));
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
  assert.equal(isNavVisible(state), false, 'keine Leiste während der Profilerstellung');
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

test('Untere Leiste erst ab dem Abschluss der Runde und in „Mein Profil“', () => {
  for (const screen of [SCREENS.START, SCREENS.REGISTER_NAME, SCREENS.REGISTER_PHONE, SCREENS.REGISTER_CODE, SCREENS.WELCOME_BACK, SCREENS.ABOUT]) {
    assert.equal(isNavVisible({ ...model.initialState(DEFAULT_CONFIG), screen }), false, screen);
  }
  const questions = answered(DEFAULT_CONFIG);
  assert.equal(isNavVisible(questions), false, 'Fragen: keine Leiste');
  assert.equal(isNavVisible(finishQuestions(questions)), false, 'Zusammenfassung: keine Leiste');
  const round = toRound(questions);
  assert.equal(round.screen, SCREENS.ROUND);
  assert.equal(isNavVisible(round), false, 'Runde: ganzer Bildschirm für Karte und Knöpfe');
  assert.equal(isNavVisible(run(questions, { type: 'tab', tab: TABS.PROFILE })), true, '„Mein Profil“ über den Knopf oben rechts, zurück über die Leiste');
  const done = finishRound(round);
  assert.equal(done.screen, SCREENS.COMPLETE);
  assert.equal(isNavVisible(done), true, 'ab dem Abschluss');
});

test('Nach Runde 1 geht es mit Runde 2 weiter; Rundennummer im Zustand und in den Abschnitten', () => {
  let state = toRound(answered({ ...DEFAULT_CONFIG, roundCardLimit: 4 }));
  const answer = (cardId) => ({ type: 'event', event: { type: 'ANSWER', cardId, response: LIKE, round: state.roundNumber } });
  for (const cardId of ['F01', 'F02', 'F03', 'F04']) state = run(state, answer(cardId));
  assert.deepEqual([state.screen, state.roundNumber], [SCREENS.COMPLETE, 1]);
  state = run(state, { type: 'nextRound' });
  assert.deepEqual([state.screen, state.roundNumber], [SCREENS.ROUND, 2]);
  assert.equal(isNavVisible(state), false);
  const [, roundStep] = creationSteps(state, model.roundOf(state));
  assert.deepEqual([roundStep.state, roundStep.number, roundStep.answered, roundStep.total], ['current', 2, 0, 4]);
  assert.equal(nextCard(model.roundOf(state), state.config).stage, 2);
  state = finishRound(state);
  assert.deepEqual([state.screen, state.roundNumber], [SCREENS.COMPLETE, 2]);
  // Neues Ausfüllen der Fragen beginnt wieder bei Runde 1
  assert.equal(finishQuestions({ ...state, screen: SCREENS.QUESTIONS, step: 2 }).roundNumber, 1);
  // Wiederkehrende Person macht in derselben Runde weiter
  const back = run(model.initialState(DEFAULT_CONFIG, { account, saved: { sessionId: 'abc', state } }), { type: 'welcomeContinue' });
  assert.deepEqual([back.screen, back.roundNumber], [SCREENS.COMPLETE, 2]);
});

test('Vier Runden steigen jeweils eine Ebene ab und überschreiten auch mit alten Limits nie 15 Karten', () => {
  for (const selection of ['fixed', 'adaptive']) for (const roundCardLimit of [4, 12, 13, 15, 30]) {
    let state = toRound(answered({ ...DEFAULT_CONFIG, roundCardLimit, selection, holdout: 0 }));
    const counts = new Map();
    while (state.screen === SCREENS.ROUND) {
      assert.ok(state.roundNumber <= 4, `Kartenlimit ${roundCardLimit}: keine fünfte Runde`);
      while (state.screen === SCREENS.ROUND) {
        const card = nextCard(model.roundOf(state), state.config);
        assert.ok(card, 'jede laufende Runde hat eine nächste Karte');
        assert.equal(card.stage, state.roundNumber, 'jede Runde bleibt auf ihrer Ebene');
        counts.set(state.roundNumber, (counts.get(state.roundNumber) ?? 0) + 1);
        state = run(state, { type: 'event', event: { type: 'ANSWER', cardId: card.id, response: LIKE, round: state.roundNumber } });
      }
      assert.equal(state.screen, SCREENS.COMPLETE);
      assert.equal(creationProgress(model.roundOf(state), state.config).percent, state.roundNumber * 25, 'Fortschritt folgt den vier Runden');
      const next = run(state, { type: 'nextRound' });
      if (next === state) break;
      state = next;
    }
    assert.deepEqual([state.screen, state.roundNumber], [SCREENS.COMPLETE, 4]);
    assert.deepEqual([...counts.keys()], [1, 2, 3, 4]);
    for (const round of [1, 2, 3, 4]) assert.ok(counts.get(round) <= Math.min(roundCardLimit, 15), `Runde ${round}`);
    assert.equal(counts.get(4), Math.min(roundCardLimit, 15), 'Gerichte teilen dasselbe Kartenlimit');
    assert.ok(model.roundOf(state).sequence.some((id) => index.get(id).stage === 4));
    assert.equal(run(state, { type: 'nextRound' }, { type: 'nextRound' }), state, 'weitere Klicks starten keine Runde');
    assert.equal(run(state, { type: 'tab', tab: TABS.PROFILE }).tab, TABS.PROFILE);
  }
});

test('Nach Abbruch ohne Antworten werden leere Vertiefungen übersprungen; keine zusätzliche Gerichte-Runde', () => {
  let state = toRound(answered(DEFAULT_CONFIG));
  assert.equal(run(state, { type: 'nextRound' }), state);
  state = run(state, { type: 'end' });
  assert.equal(state.endedEarly, true);
  state = run(state, { type: 'nextRound' });
  assert.deepEqual([state.screen, state.roundNumber], [SCREENS.ROUND, 4]);
  assert.equal(nextCard(model.roundOf(state), state.config).stage, 4);
  state = run(state, { type: 'end' });
  assert.equal(run(state, { type: 'nextRound' }), state);
  assert.deepEqual([state.screen, state.roundNumber], [SCREENS.COMPLETE, 4]);
});

test('Gespeicherte Sitzungen ab Runde 5 kehren zum Abschluss zurück und behalten ihre Antworten', () => {
  const base = toRound(answered(DEFAULT_CONFIG));
  const events = [{ type: 'ANSWER', cardId: 'F01', response: LIKE, round: 1 }, { type: 'ANSWER', cardId: 'F11', response: LIKE, round: 5 }];
  for (const screen of [SCREENS.ROUND, SCREENS.COMPLETE]) {
    const saved = { sessionId: 'legacy', state: { ...base, config: { roundCardLimit: 10 }, screen, roundNumber: 5, events } };
    const restored = model.initialState(DEFAULT_CONFIG, { account, saved });
    assert.equal(restored.screen, SCREENS.WELCOME_BACK);
    const resumed = run(restored, { type: 'welcomeContinue' });
    assert.deepEqual([resumed.screen, resumed.roundNumber], [SCREENS.COMPLETE, 4]);
    assert.deepEqual(resumed.events, events);
    assert.deepEqual(model.roundOf(resumed).sequence, ['F01', 'F11']);
    assert.equal(run(resumed, { type: 'nextRound' }), resumed);
  }
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

test('Gerichte sind Runde 4; startDishes kann weder vorher noch danach eine zusätzliche Runde starten', () => {
  let state = toRound(answered({ ...DEFAULT_CONFIG, roundCardLimit: 4, holdout: 0 }));
  assert.equal(run(state, { type: 'startDishes' }), state, 'nicht mitten in einer Runde');
  for (let round = 1; round <= 3; round += 1) {
    state = finishRound(state);
    assert.equal(run(state, { type: 'startDishes' }), state);
    state = run(state, { type: 'nextRound' });
  }
  assert.deepEqual([state.screen, state.roundMode, state.dishRound, state.roundNumber], [SCREENS.ROUND, 'main', 0, 4]);
  const dishRound = model.roundOf(state);
  assert.equal(dishRound.round, 4);
  const first = nextCard(dishRound, state.config);
  assert.equal(first.stage, 4, 'nur Gerichte');
  assert.equal(first.dish, true);
  assert.equal(creationSteps(state, dishRound)[1].number, 4);
  state = finishRound(state);
  assert.equal(state.screen, SCREENS.COMPLETE, 'Gerichte-Runde nach dem Kartenlimit fertig');
  assert.equal(run(state, { type: 'nextRound' }), state);
  assert.equal(run(state, { type: 'startDishes' }), state);
  assert.equal(model.mainRoundOf(state).sequence.length, 16, 'vier Runden zu je vier Karten im selben Log');
});

test('Alte vierte Runde setzt mit Gerichten fort; gespeicherte Antworten und Ausschlüsse bleiben erhalten', () => {
  const base = toRound(answered(DEFAULT_CONFIG));
  const events = [{ type: 'ANSWER', cardId: 'F12.1.1', response: LIKE, round: 4 }];
  const saved = { sessionId: 'alt-runde4', state: { ...base, config: { roundCardLimit: 30 }, screen: SCREENS.COMPLETE, roundNumber: 4, events } };
  const resumed = run(model.initialState(DEFAULT_CONFIG, { account, saved }), { type: 'welcomeContinue' });
  assert.deepEqual([resumed.screen, resumed.roundNumber, resumed.config.roundCardLimit], [SCREENS.ROUND, 4, 15]);
  assert.deepEqual(resumed.events, events);
  assert.deepEqual(resumed.onboarding, base.onboarding);
  assert.equal(nextCard(model.roundOf(resumed), resumed.config).stage, 4);
  assert.equal(model.roundOf(resumed).roundSequence.length, 0, 'frühere Lebensmittel verbrauchen keine Gerichteplätze');
  const stopped = run(resumed, { type: 'end' });
  const reopened = run(model.initialState(DEFAULT_CONFIG, { account, saved: { state: stopped } }), { type: 'welcomeContinue' });
  assert.equal(reopened.screen, SCREENS.COMPLETE, 'bewusst beendete neue Runde wird nicht wieder geöffnet');
});

test('Alte G1-Gerichte werden Runde 4 zugeordnet und zählen zu ihrer Obergrenze', () => {
  const base = toRound(answered(DEFAULT_CONFIG));
  const events = [{ type: 'ANSWER', cardId: 'D01', response: LIKE, round: 'G1' }];
  const saved = { state: { ...base, config: { roundCardLimit: 10 }, screen: SCREENS.ROUND, roundMode: 'dishes', dishRound: 1, events } };
  const resumed = run(model.initialState(DEFAULT_CONFIG, { account, saved }), { type: 'welcomeContinue' });
  assert.equal(resumed.roundNumber, 4);
  assert.equal(resumed.roundMode, 'main');
  assert.equal(resumed.config.roundCardLimit, 13);
  assert.deepEqual(model.roundOf(resumed).roundSequence, ['D01']);
  assert.notEqual(nextCard(model.roundOf(resumed), resumed.config).id, 'D01');
  assert.equal(run(finishRound(resumed), { type: 'startDishes' }).screen, SCREENS.COMPLETE);
});

test('Runde fortsetzen: begonnene Runde wieder öffnen, ohne beantwortete Karten; nicht mehr nach Antworten in Runde 2', () => {
  let state = toRound(answered({ ...DEFAULT_CONFIG, roundCardLimit: 4 }));
  const first = nextCard(model.roundOf(state), state.config).id;
  state = run(state, { type: 'event', event: { type: 'ANSWER', cardId: first, response: LIKE, round: 1 } });
  state = run(state, { type: 'end' });
  assert.equal(state.screen, SCREENS.COMPLETE);
  const resumed = run(state, { type: 'resumeRound', round: 1 });
  assert.deepEqual([resumed.screen, resumed.roundNumber], [SCREENS.ROUND, 1]);
  assert.notEqual(nextCard(model.roundOf(resumed), resumed.config).id, first, 'beantwortete Karte kommt nicht noch einmal');
  // Weiter mit Runde 2 und dort antworten: Runde 1 lässt sich nicht mehr fortsetzen
  let later = run(state, { type: 'nextRound' });
  later = run(later, { type: 'event', event: { type: 'ANSWER', cardId: nextCard(model.roundOf(later), later.config).id, response: LIKE, round: 2 } });
  later = run(later, { type: 'end' });
  assert.equal(run(later, { type: 'resumeRound', round: 1 }), later);
});
