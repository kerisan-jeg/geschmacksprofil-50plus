import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CSV_COLUMNS, EVENT_FIELDS, sessionsToCsv, summarizeSession } from './export.js';

// localStorage-Ersatz für Node
function fakeStorage({ broken = false } = {}) {
  const data = new Map();
  const fail = () => {
    if (broken) throw new Error('SecurityError');
  };
  return {
    get length() { fail(); return data.size; },
    key(i) { fail(); return [...data.keys()][i] ?? null; },
    getItem(key) { fail(); return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { fail(); data.set(key, String(value)); },
    removeItem(key) { fail(); data.delete(key); },
  };
}

const { createLogger, deleteAllSessions, listSessions } = await import('./logger.js');

const event = {
  cardId: 'F13',
  stage: 1,
  parentId: null,
  positionInRound: 2,
  response: 'INTOLERANT',
  timestamp: '2026-10-12T10:00:00.000Z',
  responseTimeMs: 1830,
  inputMethod: 'link',
  selectionReason: 'stage1_fixed_order',
  excludedCardIds: ['F13.1.1'],
};

test('CSV-Export enthält alle Pflichtfelder und eine Zeile pro Ereignis mit sessionId', () => {
  for (const field of EVENT_FIELDS) assert.ok(CSV_COLUMNS.includes(field), field);
  const sessions = [
    { sessionId: 'abc', participantCode: 'T07', config: { roundCardLimit: 10, tutorial: true }, events: [event, { ...event, response: 'UNDO' }] },
    { sessionId: 'def', participantCode: null, config: { roundCardLimit: 6, tutorial: false }, events: [{ ...event, cardId: 'F01', response: 'LIKE' }] },
  ];
  const lines = sessionsToCsv(sessions).trim().split('\r\n');
  const header = lines[0].split(',');
  assert.deepEqual(header, CSV_COLUMNS);
  assert.equal(lines.length, 4);
  const rows = lines.slice(1).map((line) => Object.fromEntries(line.split(',').map((cell, i) => [header[i], cell])));
  assert.deepEqual(rows.map((row) => row.sessionId), ['abc', 'abc', 'def']);
  assert.equal(rows[0].response, 'INTOLERANT');
  assert.equal(rows[0].excludedCardIds, 'F13.1.1');
  assert.equal(rows[0].inputMethod, 'link');
  assert.equal(rows[0].responseTimeMs, '1830');
  assert.equal(rows[2].roundCardLimit, '6');
  for (const row of rows) for (const field of EVENT_FIELDS) assert.ok(field in row, field);
});

test('CSV maskiert Kommas und Anführungszeichen', () => {
  const csv = sessionsToCsv([{ sessionId: 'x', participantCode: 'A,"B"', events: [event] }]);
  assert.ok(csv.includes('"A,""B"""'));
});

test('Logger speichert erst nach der Anmeldung, dann Onboarding, Ereignisse und Profil', () => {
  globalThis.localStorage = fakeStorage();
  const logger = createLogger({ roundCardLimit: 8, tutorial: false });
  logger.trace('screen', { screen: 'start' });
  assert.equal(listSessions().length, 0, 'keine leere Sitzung');
  logger.start({ participantCode: 'T01', ageGroup: '60-69' });
  logger.setOnboarding({
    diet: 'vegan',
    exclusions: [{ type: 'allergen', value: 'hazelnut', source: 'onboarding', origin: 'intolerances', label: 'Haselnuss' }],
    uncertain: true,
    freeTextNotes: ['Koriander'],
  });
  const logged = logger.recordEvent(event);
  assert.equal(logged.sessionId, logger.session.sessionId);
  logger.recordEvent({ ...event, response: 'UNDO' });
  logger.finish({ taste: {}, exclusions: [] });
  const [session] = listSessions();
  assert.equal(session.participantCode, 'T01');
  assert.deepEqual(session.config, { roundCardLimit: 8, tutorial: false });
  assert.equal(session.onboarding.ageGroup, '60-69');
  assert.equal(session.onboarding.diet, 'vegan');
  assert.equal(session.onboarding.uncertaintyFlag, true);
  assert.deepEqual(session.onboarding.freeTextNotes, ['Koriander']);
  assert.equal(session.onboarding.exclusions[0].source, 'onboarding');
  assert.equal(session.events.length, 2);
  assert.ok(session.endedAt && session.profile);
  const summary = summarizeSession(session);
  assert.equal(summary.finished, true);
  assert.equal(summary.answers, 0, 'rückgängig gemachte Antwort zählt nicht');
  assert.equal(summary.undos, 1);
  assert.equal(deleteAllSessions(), 1);
  assert.equal(listSessions().length, 0);
});

test('Gesperrter Speicher bricht nichts ab', () => {
  globalThis.localStorage = fakeStorage({ broken: true });
  const logger = createLogger({ roundCardLimit: 10, tutorial: true });
  logger.start({ participantCode: '', ageGroup: null });
  logger.recordEvent(event);
  assert.equal(logger.session.events.length, 1);
  assert.deepEqual(listSessions(), []);
  assert.equal(deleteAllSessions(), 0);
});

test('Nach einem Neuladen geht dieselbe Sitzung weiter; ungespeicherte Ereignisse werden übernommen', () => {
  globalThis.localStorage = fakeStorage();
  const first = createLogger({ roundCardLimit: 10, tutorial: true });
  first.start({ participantCode: 'T02', ageGroup: '50-59' });
  first.recordEvent({ ...event, response: 'LIKE', cardId: 'F01' });
  const resumed = createLogger({ roundCardLimit: 10, tutorial: true }, { resumeSessionId: first.session.sessionId });
  assert.equal(resumed.session.sessionId, first.session.sessionId);
  assert.equal(resumed.session.events.length, 1);
  resumed.recordEvent({ ...event, response: 'DISLIKE', cardId: 'F02' });
  assert.equal(listSessions().length, 1);
  assert.equal(listSessions()[0].events.length, 2);
  // Sitzung war noch nicht gespeichert (vor der Einwilligung): Ereignisse aus dem gespeicherten Stand übernehmen
  const seeded = createLogger({ roundCardLimit: 10, tutorial: true }, { resumeSessionId: 'neu123', seedEvents: [{ type: 'AUTH_STARTED', timestamp: 't' }] });
  assert.deepEqual(seeded.session.events, [{ type: 'AUTH_STARTED', timestamp: 't', sessionId: 'neu123' }]);
  assert.equal(listSessions().length, 1, 'erst nach der Einwilligung gespeichert');
});

test('CSV: Spalte round für jede Antwort (ältere Antworten ohne Feld = Runde 1), leer bei anderen Ereignissen', () => {
  const session = {
    sessionId: 's-rounds',
    config: { roundCardLimit: 10 },
    onboarding: {},
    events: [
      { type: 'ANSWER', cardId: 'F01', response: 'LIKE' },
      { type: 'ANSWER', cardId: 'F01.2', response: 'LIKE', round: 2 },
      { type: 'DIET_CHANGED', source: 'profile', diet: 'vegan', previousDiet: null },
    ],
  };
  const [header, ...rows] = sessionsToCsv([session]).trim().split('\r\n');
  const column = header.split(',').indexOf('round');
  assert.ok(column >= 0);
  assert.deepEqual(rows.map((row) => row.split(',')[column]), ['1', '2', '']);
});

test('CSV und Übersicht ab Version 0.7: Phase, Kontrollkarten, bestätigte Vermutungen und Auswahl der Sitzung', () => {
  const session = {
    sessionId: 's-checks',
    config: { roundCardLimit: 10, selection: 'adaptive', holdout: 2 },
    onboarding: {},
    events: [
      { type: 'HOLDOUT_DRAWN', cardIds: ['F12.3', 'F01.2'], method: 'stratified-random-v1', eligible: 36 },
      { type: 'ANSWER', cardId: 'F12', response: 'LIKE', round: 1, phase: 'main', selectionReason: 'stage1_family' },
      { type: 'ANSWER', cardId: 'F12.3', response: 'DISLIKE', round: 1, phase: 'holdout', selectionReason: 'holdout_check' },
      { type: 'RATING_CHANGED', source: 'profile', cardId: 'F12.1', rating: 'PREFER', previousRating: null, fromPrediction: true, predictedScore: 0.5 },
    ],
  };
  const [header, ...lines] = sessionsToCsv([session]).trim().split('\r\n');
  const columns = header.split(',');
  const rows = lines.map((line) => Object.fromEntries(line.split(',').map((cell, i) => [columns[i], cell])));
  assert.equal(rows[0].cardIds, 'F12.3|F01.2');
  assert.deepEqual(rows.map((row) => row.phase), ['', 'main', 'holdout', '']);
  assert.deepEqual([rows[3].fromPrediction, rows[3].predictedScore], ['true', '0.5']);
  assert.ok(rows.every((row) => row.selection === 'adaptive' && row.holdout === '2'));
  assert.deepEqual(summarizeSession(session).checks, { answered: 1, drawn: 2 });
  // Ältere Sitzungen: feste Reihenfolge, keine Kontrollkarten
  const [, old] = sessionsToCsv([{ sessionId: 'alt', config: { roundCardLimit: 10 }, events: [event] }]).trim().split('\r\n');
  const legacy = Object.fromEntries(old.split(',').map((cell, i) => [columns[i], cell]));
  assert.deepEqual([legacy.selection, legacy.holdout], ['fixed', '0']);
  assert.deepEqual(summarizeSession({ events: [event] }).checks, { answered: 0, drawn: 0 });
});
