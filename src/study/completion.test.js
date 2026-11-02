import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionCompletion } from './completion.js';
import { sessionRow } from '../sync/sync.js';

const rounds = (count = 4) => [1, 2, 3, 4].map((round) => ({ round, status: round <= count ? 'completed' : 'open', answered: round <= count ? 13 : 0, total: 13, empty: false }));
const trace = [1, 2, 3, 4].map((round) => ({ type: 'round_end', round, completed: true, at: `2026-11-02T10:0${round}:00Z` }));
const survey = { submittedAt: '2026-11-02T10:05:00Z' };

test('Abgeschickte Befragung nach Runde 1 ist kein vollständiger Studienablauf', () => {
  const session = { sessionId: 'early', trace: trace.slice(0, 1), survey };
  const status = sessionCompletion(session, rounds(1));
  assert.equal(status.surveySubmitted, true);
  assert.equal(status.roundsCompleted, 1);
  assert.equal(status.allRoundsCompleted, false);
  assert.equal(status.studyCompleted, false);
  const row = sessionRow({ ...session, completion: status });
  assert.equal(row.finished, true, 'bestehende Datenbankspalte behält ihre ältere Bedeutung');
  assert.equal(row.data.completion.studyCompleted, false, 'neue Merkmale sind im JSON eindeutig');
});

test('Alle Runden und anschliessende Befragung ergeben vollständigen Ablauf', () => {
  const status = sessionCompletion({ trace, survey }, rounds());
  assert.equal(status.allRoundsCompleted, true);
  assert.equal(status.studyCompleted, true);
  assert.equal(status.profileCompletedAt, '2026-11-02T10:04:00Z');
  assert.equal(sessionCompletion({ trace }, rounds()).studyCompleted, false, 'Runden allein ersetzen die Befragung nicht');
});

test('Eine vor den späteren Runden abgeschickte Befragung wird nicht nachträglich als vollständig gezählt', () => {
  const status = sessionCompletion({ trace, survey: { submittedAt: '2026-11-02T10:02:30Z' } }, rounds());
  assert.equal(status.allRoundsCompleted, true);
  assert.equal(status.surveyAfterProfileCompletion, false);
  assert.equal(status.studyCompleted, false);
});

test('Späterer Besuch einer fertigen Runde ändert den ursprünglichen vollständigen Abschluss nicht', () => {
  const revisited = [...trace, { type: 'round_end', round: 4, completed: true, at: '2026-11-02T10:08:00Z' }];
  const status = sessionCompletion({ trace: revisited, survey }, rounds());
  assert.equal(status.profileCompletedAt, '2026-11-02T10:04:00Z');
  assert.equal(status.studyCompleted, true);
  const missingProof = sessionCompletion({ trace: trace.slice(0, 3), survey }, rounds());
  assert.equal(missingProof.profileCompletedAt, null);
  assert.equal(missingProof.studyCompleted, null, 'fehlender Nachweis einer nichtleeren Runde bleibt unbekannt');
});

test('Fehlende Zeitnachweise bleiben unbekannt; leere erlaubte Runden sind gesondert erkennbar', () => {
  const uncertain = sessionCompletion({ survey }, rounds());
  assert.equal(uncertain.studyCompleted, null);
  const available = rounds();
  available[3] = { round: 4, status: 'completed', answered: 0, total: 0, empty: true };
  const status = sessionCompletion({ trace: trace.slice(0, 3), survey }, available);
  assert.equal(status.studyCompleted, true);
  assert.equal(status.rounds[3].empty, true);
});
