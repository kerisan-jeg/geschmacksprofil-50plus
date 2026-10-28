// Datenschutz seit dem 28.10.2026: keine Handynummer mehr. Der Vorname aus der Anmeldung steht als participantName in
// der Sitzung und im Export (Teamentscheid, für die Testleitung), abschaltbar mit PRIVACY.logParticipantName.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG, PRIVACY } from '../config.js';
import { createAppModel } from '../app/model.js';
import { indexCatalog } from '../logic/catalog.js';
import { buildProfile } from '../logic/engine.js';
import { AUTH_COMPLETED, AUTH_STARTED, EXCLUSION_ADDED, RATING_CHANGED } from '../logic/events.js';
import { LIKE, PREFER } from '../logic/answers.js';
import { ACCOUNT_KEY, APP_STATE_KEY, loadAccount, saveAccount, saveAppState } from '../storage/local.js';
import { createLogger, listSessions } from './logger.js';
import { sessionsToCsv, sessionsToJson } from './export.js';

function fakeStorage() {
  const data = new Map();
  return {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    dump: () => [...data.entries()],
  };
}

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const stage0 = read('../data/stage0.json');
const model = createAppModel({ index: indexCatalog(read('../data/catalog.json').cards), stage0, allergens: read('../data/allergens.json') });

const FIRST_NAME = 'Annelies';

// Anmeldung, Fragebogen, Runde und Profiländerung wie in App.jsx
function runSession(logParticipantName) {
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  const previous = PRIVACY.logParticipantName;
  PRIVACY.logParticipantName = logParticipantName;
  try {
    const logger = createLogger(DEFAULT_CONFIG);
    const log = (state, event) => model.reducer(state, { type: 'log', event: logger.recordEvent({ timestamp: new Date().toISOString(), ...event }) });
    let state = model.initialState(DEFAULT_CONFIG);
    state = log(state, { type: AUTH_STARTED });
    state = model.reducer(state, { type: 'registration', changes: { firstName: FIRST_NAME } });
    saveAccount({ firstName: FIRST_NAME });
    logger.setParticipantName(FIRST_NAME);
    state = log(state, { type: AUTH_COMPLETED, method: 'name' });
    state = model.reducer(state, { type: 'register', firstName: FIRST_NAME });
    logger.start({ participantCode: 'T09', ageGroup: '70-79' });
    state = model.reducer(state, { type: 'about', person: { ageGroup: '70-79', participantCode: 'T09', consent: true } });
    state = model.reducer(state, { type: 'setAnswer', questionId: 'diet', value: 'none' });
    state = model.reducer(state, { type: 'step', to: stage0.questions.length });
    logger.setOnboarding(state.onboarding);
    state = model.reducer(state, { type: 'event', event: logger.recordEvent({ type: 'ANSWER', cardId: 'F01', response: LIKE, timestamp: new Date().toISOString() }) });
    state = log(state, { type: RATING_CHANGED, source: 'profile', cardId: 'F01', rating: PREFER, previousRating: LIKE });
    state = log(state, { type: EXCLUSION_ADDED, source: 'profile', section: 'never', exclusions: [{ type: 'card', value: 'F01.3', label: 'Schwein' }] });
    logger.finish(buildProfile(model.roundOf(state)));
    saveAppState(state, logger.session.sessionId);
    return { storage, logger, state };
  } finally {
    PRIVACY.logParticipantName = previous;
  }
}

test('Anmeldung ohne Handynummer: Konto enthält nur den Vornamen, nirgends eine Nummer', () => {
  const { storage, state } = runSession(true);
  const stored = JSON.parse(storage.getItem(ACCOUNT_KEY));
  assert.deepEqual(Object.keys(stored), ['firstName']);
  assert.equal(loadAccount().firstName, FIRST_NAME);
  assert.deepEqual(state.account, { firstName: FIRST_NAME });
  assert.deepEqual(state.registration, { firstName: '' }, 'die Eingabe bleibt nicht im Zustand');
  for (const [key, value] of storage.dump()) assert.ok(!/\+41|phone|sms/i.test(value), `${key} ohne Nummer`);
});

test('Vorname steht in Sitzung und Export (participantName), aber nicht im gespeicherten App-Stand', () => {
  const { storage, logger } = runSession(true);
  const sessions = listSessions();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].participantName, FIRST_NAME);
  const csv = sessionsToCsv(sessions);
  assert.ok(csv.includes(logger.session.sessionId) && csv.includes('T09') && csv.includes(FIRST_NAME));
  assert.ok(sessionsToJson(sessions).includes(`"participantName": "${FIRST_NAME}"`));
  const appState = storage.getItem(APP_STATE_KEY);
  assert.ok(appState && !appState.includes(FIRST_NAME), 'der Stand der App trägt den Vornamen nicht (er steht im Konto)');
});

test('Mit PRIVACY.logParticipantName = false bleibt der Vorname nur im Konto auf dem Gerät', () => {
  const { storage, logger } = runSession(false);
  const sessions = listSessions();
  assert.equal(sessions[0].participantName, null);
  for (const text of [sessionsToJson(sessions), sessionsToCsv(sessions), JSON.stringify(logger.session)]) assert.ok(!text.includes(FIRST_NAME), 'kein Vorname im Export');
  for (const [key, value] of storage.dump()) {
    if (key === ACCOUNT_KEY) continue;
    assert.ok(!value.includes(FIRST_NAME), `${key} ohne Vorname`);
  }
});
