import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG } from '../config.js';
import { createAppModel } from '../app/model.js';
import { maskPhone } from '../auth/phone.js';
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
const PHONE = '+41795551234';
// Alle Schreibweisen, unter denen die Nummer auftauchen könnte
const PHONE_FORMS = ['795551234', '079 555 12 34', '79 555 12 34', '0795551234', '555 12 34', '5551234'];

test('Vorname und Telefonnummer sind in keiner exportierbaren Datenstruktur enthalten', () => {
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  const logger = createLogger(DEFAULT_CONFIG);
  const log = (state, event) => model.reducer(state, { type: 'log', event: logger.recordEvent({ timestamp: new Date().toISOString(), ...event }) });

  // Registrierung wie in App.jsx
  let state = model.initialState(DEFAULT_CONFIG);
  state = log(state, { type: AUTH_STARTED });
  state = model.reducer(state, { type: 'registration', changes: { firstName: FIRST_NAME, phoneInput: '079 555 12 34' } });
  state = model.reducer(state, { type: 'codeSent', request: { requestId: 'sim-1', sentAt: 0, resendAvailableAt: 30_000, e164: PHONE } });
  const account = { firstName: FIRST_NAME, phoneMasked: maskPhone(PHONE), verifiedAt: new Date().toISOString() };
  saveAccount(account);
  state = log(state, { type: AUTH_COMPLETED, method: 'sms-simulated' });
  state = model.reducer(state, { type: 'verified', account });
  logger.start({ participantCode: 'T09', ageGroup: '70-79' });
  state = model.reducer(state, { type: 'about', person: { ageGroup: '70-79', participantCode: 'T09', consent: true } });

  // Fragebogen, Runde und Profiländerungen
  state = model.reducer(state, { type: 'setAnswer', questionId: 'diet', value: 'none' });
  state = model.reducer(state, { type: 'step', to: stage0.questions.length });
  logger.setOnboarding(state.onboarding);
  state = model.reducer(state, { type: 'event', event: logger.recordEvent({ type: 'ANSWER', cardId: 'F01', response: LIKE, timestamp: new Date().toISOString() }) });
  state = log(state, { type: RATING_CHANGED, source: 'profile', cardId: 'F01', rating: PREFER, previousRating: LIKE });
  state = log(state, { type: EXCLUSION_ADDED, source: 'profile', section: 'never', exclusions: [{ type: 'card', value: 'F01.3', label: 'Schwein' }] });
  logger.finish(buildProfile(model.roundOf(state)));
  saveAppState(state, logger.session.sessionId);

  // Exporte (JSON und CSV) und gespeicherte Sitzungen
  const sessions = listSessions();
  assert.equal(sessions.length, 1);
  const exports = [sessionsToJson(sessions), sessionsToCsv(sessions), JSON.stringify(sessions), JSON.stringify(logger.session)];
  for (const text of exports) {
    assert.ok(!text.includes(FIRST_NAME), 'kein Vorname im Export');
    assert.ok(!text.includes(PHONE), 'keine Telefonnummer im Export');
    for (const form of PHONE_FORMS) assert.ok(!text.includes(form), `keine Telefonnummer (${form})`);
    assert.ok(!text.includes(maskPhone(PHONE)), 'auch nicht gekürzt');
  }
  // Exporte enthalten nur sessionId und die Teilnehmer-Nr.
  assert.ok(exports[1].includes(logger.session.sessionId));
  assert.ok(exports[1].includes('T09'));

  // Gespeicherter Stand der App: ohne Namen und ohne Nummer (die stehen nur im Konto)
  const appState = storage.getItem(APP_STATE_KEY);
  assert.ok(appState && !appState.includes(FIRST_NAME));
  for (const form of [PHONE, ...PHONE_FORMS]) assert.ok(!appState.includes(form), `Stand ohne ${form}`);

  // Konto: nur lokal, nur der Vorname und die gekürzte Nummer
  const stored = JSON.parse(storage.getItem(ACCOUNT_KEY));
  assert.deepEqual(Object.keys(stored).sort(), ['firstName', 'phoneMasked', 'verifiedAt']);
  assert.equal(stored.phoneMasked, '+41 79 *** ** 34');
  assert.equal(loadAccount().firstName, FIRST_NAME);
  // Kein anderer Speicherplatz enthält Vorname oder Nummer
  for (const [key, value] of storage.dump()) {
    if (key === ACCOUNT_KEY) continue;
    assert.ok(!value.includes(FIRST_NAME), `${key} ohne Vorname`);
    assert.ok(!value.includes(PHONE), `${key} ohne Nummer`);
  }
});

test('Die volle Telefonnummer lässt sich nicht im Konto speichern', () => {
  globalThis.localStorage = fakeStorage();
  assert.throws(() => saveAccount({ firstName: 'Anna', phoneMasked: '+41 79 123 45 67' }));
  assert.throws(() => saveAccount({ firstName: 'Anna', phoneMasked: PHONE }));
  assert.doesNotThrow(() => saveAccount({ firstName: 'Anna', phoneMasked: maskPhone(PHONE) }));
});
