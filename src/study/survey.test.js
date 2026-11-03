import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_SURVEY_VERSION, NOT_ASSESSABLE, NOT_TRIED, PREVIOUS_SURVEY_VERSION, SURVEY_VERSION, submittedSurvey, surveyIssues, surveyVersion } from './survey.js';

const values = () => ({ version: SURVEY_VERSION, ease: 4, swipeClarity: NOT_TRIED, effort: 2, repetition: 3, fit: 5, length: 2, insightsSeen: 'no', remarks: '  Mein Kommentar  ' });

test('Neue Befragung speichert Sichtung und lässt nicht gestellte Vermutungsfragen leer', () => {
  const result = submittedSurvey(values(), new Date('2026-11-02T10:00:00Z'));
  assert.equal(result.version, SURVEY_VERSION);
  assert.equal(result.swipeClarity, NOT_TRIED);
  assert.equal(result.effort, 2);
  assert.equal(result.repetition, 3);
  assert.equal(result.insightsSeen, 'no');
  assert.equal(result.insightsClarity, null);
  assert.equal(result.insightsFit, null);
  assert.equal(result.remarks, 'Mein Kommentar');
  assert.equal(result.submittedAt, '2026-11-02T10:00:00.000Z');
  assert.ok(!Object.hasOwn(result, 'clarity'), 'neue Wischfrage nicht als alte Frage speichern');
});

test('Sechs-Fragen-Fassung bleibt study-v2 und wird nicht nachträglich zu neuen Fragen umgedeutet', () => {
  const { insightsSeen, version, ...old } = values();
  assert.equal(surveyVersion(old), PREVIOUS_SURVEY_VERSION);
  assert.equal(submittedSurvey(old).version, PREVIOUS_SURVEY_VERSION);
  assert.ok(!Object.hasOwn(submittedSurvey(old), 'insightsSeen'));
});

test('Vermutungsfragen sind nur nach Ja erforderlich; Nicht-beurteilbar und fehlende Anzeige bleiben eigenständig', () => {
  assert.deepEqual(surveyIssues({ ...values(), insightsSeen: 'yes' }), ['insightsClarity', 'insightsFit']);
  const seen = submittedSurvey({ ...values(), insightsSeen: 'yes', insightsClarity: 4, insightsFit: NOT_ASSESSABLE });
  assert.equal(seen.insightsClarity, 4);
  assert.equal(seen.insightsFit, NOT_ASSESSABLE);
  const empty = submittedSurvey({ ...values(), insightsSeen: 'no_predictions', insightsClarity: 5, insightsFit: 5 });
  assert.equal(empty.insightsClarity, null, 'alte Auswahl darf nach geändertem Filter nicht bewertet werden');
  assert.equal(empty.insightsFit, null);
  assert.throws(() => submittedSurvey({ ...values(), insightsSeen: null }), /insightsSeen/);
});

test('Alte vier Antworten bleiben als eigene Fragefassung lesbar', () => {
  const old = { ease: 4, clarity: 3, fit: 5, length: 2 };
  assert.equal(surveyVersion(old), LEGACY_SURVEY_VERSION);
  assert.deepEqual(surveyIssues(old), []);
  const result = submittedSurvey(old);
  assert.equal(result.version, LEGACY_SURVEY_VERSION);
  assert.equal(result.clarity, 3);
  assert.ok(!Object.hasOwn(result, 'swipeClarity'));
});

test('Fehlende, fremde und zu grosse Antwortwerte werden nicht als gültige Befragung gespeichert', () => {
  for (const invalid of [{ ...values(), effort: undefined }, { ...values(), length: 5 }, { ...values(), ease: NOT_TRIED }, { ...values(), version: 'unbekannt' }]) {
    assert.throws(() => submittedSurvey(invalid), /Ungültige Befragungsantworten/);
  }
});
