import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexCatalog } from '../logic/catalog.js';
import { simulateSession } from '../test/simulate.js';
import { submittedSurvey, NOT_TRIED } from '../study/survey.js';
import { participantRows, selectStudySessions, surveyDistributions, studyCsv, SURVEY_COLUMNS, formatStudySummary } from './study.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const { diets } = read('../data/stage0.json');
const config = { roundCardLimit: 4, holdout: 2, selection: 'adaptive' };
const now = '2026-10-15T10:00:00Z';
const newSurvey = (extra = {}) => submittedSurvey({ version: 'study-v2', ease: 4, swipeClarity: 4, effort: 2, repetition: 1, fit: 5, length: 2, ...extra }, new Date(now));

export function fullSession(sessionId, survey = newSurvey()) {
  const session = simulateSession({ index, diets, config, respond: () => 'LIKE', sessionId });
  const trace = [1, 2, 3, 4].flatMap((round) => {
    const answers = session.events.filter((entry) => entry.type === 'ANSWER' && entry.round === round);
    return answers.length ? [
      { type: 'round_start', round, at: new Date(Date.parse(answers[0].timestamp) - 1000).toISOString() },
      { type: 'round_end', round, completed: true, answered: answers.length, at: new Date(Date.parse(answers.at(-1).timestamp) + 1000).toISOString() },
    ] : [];
  });
  return { ...session, appVersion: '0.13.0-demo', events: [{ type: 'AUTH_STARTED', timestamp: session.startedAt }, ...session.events], trace, survey };
}

test('Eine Zeile pro Sitzung: vollständiger Ablauf und leere Anmeldung werden getrennt ausgewiesen', () => {
  const full = fullSession('full');
  const empty = { sessionId: 'empty', config, events: [{ type: 'AUTH_STARTED', timestamp: full.startedAt }], onboarding: { ageGroup: '60-69', exclusions: [] } };
  const rows = participantRows([full, empty], { index, diets });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].studyCompleted, true);
  assert.equal(rows[0].allRoundsCompleted, true);
  assert.equal(rows[0].roundsCompleted, 4);
  assert.equal(rows[0].cardsAnswered, 16);
  assert.equal(rows[0].buttonCount, 16);
  assert.equal(rows[0].profileDurationMs, 65000);
  assert.equal(rows[0].totalDurationMs, 3600000);
  assert.equal(rows[0].round2DurationMs, 14000, 'Kontrollkarten zählen zur vollständigen Rundenzeit');
  assert.equal(rows[0].round4DurationMs, 14000, 'Gerichte zählen ebenfalls zur Rundenzeit');
  assert.equal(rows[1].surveySubmitted, false);
  assert.equal(rows[1].cardsAnswered, 0);
  assert.equal(rows[1].profileDurationMs, null);
  assert.equal(rows[1].completionStatus, 'Begonnen ohne Kartenantworten');
});

test('Befragung zählt pro Teilnahme und Fragefassung, nicht pro Antwortereignis', () => {
  const old = fullSession('old', { ease: 4, clarity: 3, fit: 4, length: 2, submittedAt: now });
  const a = fullSession('a', newSurvey({ swipeClarity: NOT_TRIED }));
  const b = fullSession('b', newSurvey({ swipeClarity: 5 }));
  const c = fullSession('c', { ...newSurvey(), effort: undefined });
  const distributions = surveyDistributions([old, a, b, c]);
  const swipe = distributions.filter((row) => row.questionId === 'swipeClarity');
  assert.ok(swipe.every((row) => row.basis === 3 && row.valid === 2 && row.notTried === 1));
  assert.equal(swipe.find((row) => row.value === NOT_TRIED).share, null);
  assert.equal(swipe.find((row) => row.value === 5).share, 0.5);
  assert.equal(distributions.find((row) => row.questionId === 'clarity').basis, 1);
  assert.equal(distributions.find((row) => row.questionId === 'effort').missing, 1);
  const rows = participantRows([old, a, b, c], { index, diets });
  assert.equal(rows[0].survey_swipeClarity, null);
  assert.equal(rows[0].survey_swipeClarity_label, 'nicht erhoben in dieser Fragefassung');
  assert.equal(rows[1].survey_swipeClarity, NOT_TRIED);
  assert.equal(rows[3].surveyValid, false);
});

test('Interne Tests werden automatisch ausgeschlossen; neuere Befragung gewinnt auch bei gleicher Ereigniszahl', () => {
  const first = fullSession('same', null);
  const newer = { ...first, survey: newSurvey() };
  const result = selectStudySessions([first, newer, { ...first, sessionId: 'setup1', participantCode: 'SETUP_CHECK' }, { ...first, sessionId: 'setup2', appVersion: 'setup-check' }]);
  assert.equal(result.sessions.length, 1);
  assert.equal(result.duplicates, 1);
  assert.equal(result.excluded, 2);
  assert.equal(result.sessions[0].survey.version, 'study-v2');
  assert.equal(selectStudySessions([newer], { excludeSessionIds: ['same'] }).sessions.length, 0);
});

test('Zeit ohne Startknopf wird gekennzeichnet; fehlende Zeit wird nicht zu null Sekunden', () => {
  const session = fullSession('fallback');
  session.events = session.events.filter((entry) => entry.type !== 'AUTH_STARTED');
  const row = participantRows([session], { index, diets })[0];
  assert.equal(row.timeStartSource, 'erste Kartenantwort');
  const empty = participantRows([{ sessionId: 'empty', events: [] }], { index, diets })[0];
  assert.equal(empty.timeStartSource, 'nicht erfasst');
  assert.equal(empty.totalDurationMs, null);
});

test('Excel-CSV enthält Antworttexte, eigene Nicht-ausprobiert-Kategorie und schützt Freitext vor Formelausführung', () => {
  const rows = participantRows([fullSession('excel', newSurvey({ swipeClarity: NOT_TRIED, remarks: '=1+1; "Kommentar"\nzweite Zeile' }))], { index, diets });
  const csv = studyCsv(rows, SURVEY_COLUMNS);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('Nicht ausprobiert / kann ich nicht beurteilen'));
  assert.ok(csv.includes(`'=1+1; ""Kommentar""\nzweite Zeile`));
  assert.equal((csv.match(/"excel"/g) ?? []).length, 1);
});

test('Lesbare Zusammenfassung benennt offene Abläufe und die Vorgabe von 30 Personen', () => {
  const sessions = [fullSession('full'), { sessionId: 'empty', events: [] }];
  const selection = selectStudySessions(sessions);
  const rows = participantRows(selection.sessions, { index, diets });
  const text = formatStudySummary({ sessions, rows, selection, distributions: surveyDistributions(sessions) });
  assert.ok(text.includes('mindestens 30 Personen ab 50'));
  assert.ok(text.includes('Begonnen ohne Kartenantworten: 1'));
  assert.ok(text.includes('Karten pro Sitzung mit Kartenantworten (Median, n=1): 16'));
  assert.ok(text.includes('Benötigte Hilfe und erfolglose Wischversuche werden nicht automatisch erkannt'));
});

test('Kontrollvergleich gewichtet jede Sitzung gleich, auch bei unterschiedlich vielen bewerteten Kontrollen', () => {
  const sessions = [fullSession('a'), fullSession('b')];
  const selection = selectStudySessions(sessions);
  const rows = participantRows(sessions, { index, diets });
  const technical = {
    datas: sessions.map((session) => ({ sessionId: session.sessionId, checks: [{ response: 'LIKE' }] })),
    checks: [
      { selection: 'adaptive', sessionId: 'a', hit: true },
      ...[1, 2, 3].map(() => ({ selection: 'adaptive', sessionId: 'b', hit: false })),
    ],
  };
  const text = formatStudySummary({ sessions, rows, selection, distributions: surveyDistributions(sessions) }, technical);
  assert.ok(text.includes('adaptive): 50 % (n=2 Sitzungen)'), 'Mittel von 100 % und 0 %, keine gepoolten 25 %');
});
