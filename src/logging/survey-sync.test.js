// Sitzung und Export seit dem 29.10.2026: Sync-Token, Meldung an die zentrale Speicherung erst ab der Einwilligung,
// Befragung in Sitzung und CSV, Vorname standardmässig nicht in der Sitzung.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CSV_COLUMNS, sessionsToCsv, summarizeSession } from './export.js';

function fakeStorage() {
  const data = new Map();
  return {
    get length() { return data.size; },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

globalThis.localStorage = fakeStorage();
const { createLogger, listSessions } = await import('./logger.js');
const { PRIVACY } = await import('../config.js');

test('Sync-Token je Sitzung; onChange erst nach „Über dich“ (Einwilligung), dann bei jeder Änderung', () => {
  const changes = [];
  const logger = createLogger({ roundCardLimit: 13 }, { onChange: (session) => changes.push(session.events.length) });
  assert.match(logger.session.syncToken, /^[0-9a-f]{32}$/);
  assert.equal(logger.session.survey, null);
  logger.recordEvent({ type: 'AUTH_STARTED', timestamp: 'x' });
  assert.deepEqual(changes, [], 'vor der Einwilligung keine Meldung');
  logger.start({ participantCode: 'T02', ageGroup: '70-79' });
  logger.recordEvent({ cardId: 'F01', response: 'LIKE', timestamp: 'y' });
  assert.deepEqual(changes, [1, 2]);
  // Fortgesetzte Sitzung behält das Token
  const resumed = createLogger({ roundCardLimit: 13 }, { resumeSessionId: logger.session.sessionId });
  assert.equal(resumed.session.syncToken, logger.session.syncToken);
});

test('Standard seit dem 29.10.2026: Vorname bleibt auf dem Gerät, nicht in der Sitzung', () => {
  assert.equal(PRIVACY.logParticipantName, false);
  const logger = createLogger({ roundCardLimit: 13 });
  logger.start({ participantCode: null, ageGroup: '50-59' });
  logger.setParticipantName('Annelies');
  assert.equal(logger.session.participantName, null);
  assert.ok(!JSON.stringify(listSessions()).includes('Annelies'));
});

test('Befragung: in der Sitzung mit Zeitpunkt, in der CSV je Zeile wiederholt, in der Zusammenfassung als Kennzeichen', () => {
  const logger = createLogger({ roundCardLimit: 13 });
  logger.start({ participantCode: 'T03', ageGroup: '60-69' });
  logger.recordEvent({ cardId: 'F01', response: 'LIKE', timestamp: '2026-10-29T10:00:00.000Z' });
  logger.setSurvey({ ease: 5, clarity: 4, fit: 3, length: 2, remarks: '  Super danke  ' });
  const { survey } = logger.session;
  assert.deepEqual({ ...survey, submittedAt: null }, { ease: 5, clarity: 4, fit: 3, length: 2, remarks: 'Super danke', submittedAt: null });
  assert.match(survey.submittedAt, /^\d{4}-\d{2}-\d{2}T/);
  for (const column of ['surveyEase', 'surveyClarity', 'surveyFit', 'surveyLength', 'surveyRemarks']) assert.ok(CSV_COLUMNS.includes(column), column);
  const [header, row] = sessionsToCsv([logger.session]).trim().split('\r\n');
  const columns = header.split(',');
  const cell = (column) => row.split(',')[columns.indexOf(column)];
  assert.deepEqual([cell('surveyEase'), cell('surveyLength'), cell('surveyRemarks')], ['5', '2', 'Super danke']);
  assert.equal(summarizeSession(logger.session).survey, true);
  assert.equal(summarizeSession({ sessionId: 'x', events: [] }).survey, false);
  // Leere Anmerkung wird null
  logger.setSurvey({ ease: 1, clarity: 1, fit: 1, length: 1, remarks: '   ' });
  assert.equal(logger.session.survey.remarks, null);
});
