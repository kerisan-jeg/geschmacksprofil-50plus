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

test('Neue und frühere Altersgruppen ab 70 zählen weiterhin zur Zielgruppe der Studie', () => {
  const session = fullSession('age');
  const ageGroups = ['50-59', '60-69', '70+', '70-79', '80+', '40-49', null];
  const sessions = ageGroups.map((ageGroup, i) => ({
    ...session,
    sessionId: 'age-' + i,
    onboarding: { ...session.onboarding, ageGroup },
  }));
  const rows = participantRows(sessions, { index, diets });
  assert.deepEqual(rows.map((row) => row.ageGroup), ageGroups);
  assert.deepEqual(rows.map((row) => row.ageEligible), [true, true, true, true, true, false, null]);
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

test('Weitere Einblicke: Sichtungsfilter, Nicht-beurteilbar und alte Fassungen haben getrennte Bezugsgruppen', () => {
  const current = (extra) => submittedSurvey({ version: 'study-v3', ease: 4, swipeClarity: 4, effort: 2, repetition: 1, fit: 5, length: 2, ...extra }, new Date(now));
  const sessions = [
    fullSession('seen', current({ insightsSeen: 'yes', insightsClarity: 4, insightsFit: 5 })),
    fullSession('unsure', current({ insightsSeen: 'yes', insightsClarity: 3, insightsFit: 'not_assessable' })),
    fullSession('unseen', current({ insightsSeen: 'no' })),
    fullSession('empty', current({ insightsSeen: 'no_predictions' })),
    fullSession('v2'),
  ];
  const distributions = surveyDistributions(sessions);
  const fit = distributions.find((row) => row.questionId === 'insightsFit' && row.value === 5);
  assert.equal(fit.basis, 4);
  assert.equal(fit.eligible, 2);
  assert.equal(fit.skipped, 2);
  assert.equal(fit.valid, 1);
  assert.equal(fit.notAssessed, 1);
  assert.equal(fit.missing, 0);
  assert.equal(fit.percent, 100, 'nur eine beurteilbare Bewertung; kein Mittelwert mit nicht gesehen');
  const rows = participantRows(sessions, { index, diets });
  assert.ok(rows.slice(0, 4).every((row) => row.surveyValid));
  assert.equal(rows[2].survey_insightsFit, null);
  assert.match(rows[2].survey_insightsFit_label, /nicht gefragt/);
  assert.match(rows[4].survey_insightsFit_label, /nicht erhoben/);
  assert.equal(rows[4].currentSurveyVersion, false);
  const text = formatStudySummary({ sessions, rows, distributions, selection: selectStudySessions(sessions) });
  assert.ok(text.includes('Laut Befragung angesehen: 2; nicht angesehen: 1; keine Vermutungen angezeigt: 1'));
  assert.ok(text.includes('bedingt nicht gefragt: 2'));
  assert.ok(text.includes('Fragefassung study-v2'));
  assert.ok(text.includes('Fragefassung study-v3'));
});

test('Öffnungsprotokoll zählt nur vor der Befragung und ersetzt weder Selbstauskunft noch Verständnis', () => {
  const session = fullSession('opened');
  session.insightsTrackingVersion = 1;
  session.trace.push(
    { type: 'profile_insights_opened', at: '2026-10-15T09:30:00Z', availablePredictions: 8 },
    { type: 'profile_insights_opened', at: '2026-10-15T09:40:00Z', availablePredictions: 0 },
    { type: 'profile_insights_opened', at: '2026-10-15T10:10:00Z', availablePredictions: 5 },
  );
  session.events.push(
    { type: 'RATING_CHANGED', fromPrediction: true, cardId: 'F12.1', rating: 'LIKE', predictedScore: 0.5, timestamp: '2026-10-15T09:31:00Z' },
    { type: 'RATING_CHANGED', fromPrediction: true, cardId: 'F12.1', rating: 'PREFER', predictedScore: 0.5, timestamp: '2026-10-15T09:32:00Z' },
    { type: 'RATING_CHANGED', fromPrediction: true, cardId: 'F12.2', rating: 'LIKE', predictedScore: 0.5, timestamp: '2026-10-15T10:11:00Z' },
  );
  const rows = participantRows([session, fullSession('old'), { ...fullSession('no-open'), insightsTrackingVersion: 1 }], { index, diets });
  assert.equal(rows[0].insightsOpens, 2);
  assert.equal(rows[0].insightsOpensWithPredictions, 1);
  assert.equal(rows[0].insightsLastAvailable, 0);
  assert.equal(rows[0].predictionReviews, 1, 'doppelte Bewertungen derselben Karte zählen einmal');
  assert.equal(rows[1].insightsOpens, null, 'alte Daten enthalten keinen Beleg für null Öffnungen');
  assert.equal(rows[2].insightsOpens, 0, 'neue Erfassung ohne Öffnung ist echte Null');
});

test('Fehlende Sichtungsantwort wird nicht mit bewusst übersprungenen Detailfragen gleichgesetzt', () => {
  const sessions = ['no', null].map((insightsSeen, i) => fullSession('filter-' + i, { ...newSurvey(), version: 'study-v3', insightsSeen }));
  const fit = surveyDistributions(sessions).find((row) => row.questionId === 'insightsFit');
  assert.equal(fit.eligible, 0);
  assert.equal(fit.skipped, 1);
  assert.equal(fit.unresolved, 1);
  const rows = participantRows(sessions, { index, diets });
  assert.equal(rows[0].surveyValid, true);
  assert.equal(rows[1].surveyValid, false);
  assert.match(rows[1].survey_insightsFit_label, /Sichtungsantwort fehlt/);
});
