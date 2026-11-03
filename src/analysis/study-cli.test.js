import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { exportCentralSessions, readConnectionSettings } from '../../scripts/export-sessions.mjs';
import { parseArgs, runEvaluation } from '../../scripts/evaluate.mjs';

function temporary() {
  const dir = mkdtempSync(path.join(tmpdir(), 'geschmacksprofil-study-test-'));
  return { dir, close() {
    const resolved = path.resolve(dir);
    const allowed = path.resolve(tmpdir()) + path.sep + 'geschmacksprofil-study-test-';
    assert.ok(resolved.startsWith(allowed));
    rmSync(resolved, { recursive: true, force: true });
  } };
}

test('Zentralexport liest mehrere Seiten mit stabiler Sortierung und unterstützt aktuelle Secret Keys', async () => {
  const temp = temporary();
  try {
    const calls = [];
    const result = await exportCentralSessions({
      url: 'https://db.example.org', serviceKey: 'sb_secret_test', out: temp.dir, now: new Date('2026-11-02T10:00:00Z'),
      fetchFn: async (url, init) => {
        calls.push({ url, headers: init.headers });
        const length = calls.length === 1 ? 500 : 1;
        const offset = calls.length === 1 ? 0 : 500;
        return { ok: true, json: async () => Array.from({ length }, (_, i) => ({ data: { sessionId: 's' + (offset + i), events: [] } })) };
      },
    });
    assert.equal(result.sessions, 501);
    assert.equal(JSON.parse(readFileSync(result.jsonFile, 'utf8')).sessions.length, 501);
    assert.deepEqual(calls.map((call) => call.headers.Range), ['0-499', '500-999']);
    assert.ok(calls.every((call) => call.url.endsWith('order=started_at.asc,id.asc')));
    assert.ok(calls.every((call) => !Object.hasOwn(call.headers, 'Authorization')));
    assert.ok(existsSync(result.csvFile));
  } finally { temp.close(); }
});

test('Auswertung erzeugt wiederholbar alle Studien-Dateien und schliesst technische Tests selbst aus', async () => {
  const temp = temporary();
  try {
    const old = { sessionId: 'old', events: [{ type: 'ANSWER', cardId: 'F01', response: 'LIKE', round: 1, inputMethod: 'button', timestamp: '2026-11-01T10:00:00Z' }], config: { roundCardLimit: 13 }, onboarding: { ageGroup: '60-69', diet: 'none', exclusions: [] }, survey: { ease: 4, clarity: 3, fit: 4, length: 2, submittedAt: '2026-11-01T10:05:00Z' } };
    const current = { ...old, sessionId: 'new', survey: { version: 'study-v2', ease: 5, swipeClarity: 'not_tried', effort: 2, repetition: 1, fit: 5, length: 2, remarks: 'Ein Kommentar', submittedAt: '2026-11-02T10:05:00Z' } };
    const insights = { ...current, sessionId: 'insights', insightsTrackingVersion: 1, trace: [{ type: 'profile_insights_opened', at: '2026-11-02T10:04:00Z', availablePredictions: 10 }], survey: { ...current.survey, version: 'study-v3', insightsSeen: 'yes', insightsClarity: 4, insightsFit: 'not_assessable' } };
    const setup = { ...current, sessionId: 'setup', appVersion: 'setup-check', survey: { ...current.survey, remarks: 'Nur technischer Test' } };
    const exported = await exportCentralSessions({
      url: 'https://db.example.org', serviceKey: 'sb_secret_test', out: temp.dir,
      fetchFn: async () => ({ ok: true, json: async () => [old, current, insights, setup].map((data) => ({ data })) }),
    });
    const options = { ...parseArgs([exported.jsonFile]), out: temp.dir, quiet: true };
    const result = runEvaluation(options);
    assert.equal(result.rows.length, 3);
    assert.equal(result.selection.excluded, 1);
    const survey = readFileSync(path.join(temp.dir, 'befragung.csv'), 'utf8');
    assert.equal((survey.match(/"old"/g) ?? []).length, 1);
    assert.equal((survey.match(/"new"/g) ?? []).length, 1);
    assert.equal((survey.match(/"insights"/g) ?? []).length, 1);
    assert.ok(survey.includes('Kann ich nicht beurteilen'));
    assert.equal(result.rows.find((row) => row.sessionId === 'insights').insightsOpens, 1);
    assert.ok(!survey.includes('Nur technischer Test'));
    for (const file of ['zusammenfassung.txt', 'teilnahmen.csv', 'befragung-zusammenfassung.csv', 'kontrollkarten-zusammenfassung.txt', 'lernkurve.csv', 'kontrollkarten.csv', 'sitzungen.csv', 'varianten.csv']) assert.ok(existsSync(path.join(temp.dir, file)), file);
    assert.ok(result.summary.includes('Fragefassung legacy-v1'));
    assert.ok(result.summary.includes('Fragefassung study-v2'));
    assert.ok(result.summary.includes('Fragefassung study-v3'));
    assert.ok(result.summary.includes('nicht ausprobiert: 1'));
    assert.equal(runEvaluation(options).summary, result.summary);
  } finally { temp.close(); }
});

test('Leerer Export-Schlüssel wird präzise benannt und ein öffentlicher Schlüssel wird abgewiesen', () => {
  const temp = temporary();
  try {
    const file = path.join(temp.dir, '.env.local');
    writeFileSync(file, 'VITE_SYNC_URL=https://db.example.org\nSYNC_SERVICE_KEY=\n# Kommentar nach leerem Wert\n', 'utf8');
    assert.throws(() => readConnectionSettings({ env: {}, file }), (error) => error.message.includes('Fehlt: SYNC_SERVICE_KEY.') && !error.message.includes('Fehlt: VITE_SYNC_URL'));
    writeFileSync(file, 'VITE_SYNC_URL=https://db.example.org\nSYNC_SERVICE_KEY=sb_publishable_test\n', 'utf8');
    assert.throws(() => readConnectionSettings({ env: {}, file }), /keinen öffentlichen/);
    writeFileSync(file, 'VITE_SYNC_URL="https://db.example.org/"\nSYNC_SERVICE_KEY="sb_secret_test"\n', 'utf8');
    assert.deepEqual(readConnectionSettings({ env: {}, file }), { url: 'https://db.example.org', serviceKey: 'sb_secret_test' });
  } finally { temp.close(); }
});

test('Vollständig ausgeschlossene Daten erzeugen einen leeren aktuellen Bericht statt alte Ergebnisse stehenzulassen', () => {
  const temp = temporary();
  try {
    const file = path.join(temp.dir, 'export.json');
    writeFileSync(file, JSON.stringify({ sessions: [{ sessionId: 'setup', appVersion: 'setup-check', events: [] }] }));
    writeFileSync(path.join(temp.dir, 'teilnahmen.csv'), 'ALTES ERGEBNIS');
    const result = runEvaluation({ ...parseArgs([file]), out: temp.dir, quiet: true });
    assert.equal(result.rows.length, 0);
    assert.equal(result.selection.excluded, 1);
    assert.ok(result.summary.includes('Keine einbezogenen Sitzungen vorhanden'));
    const csv = readFileSync(path.join(temp.dir, 'teilnahmen.csv'), 'utf8');
    assert.ok(!csv.includes('ALTES ERGEBNIS'));
    assert.equal(csv.trim().split('\r\n').length, 1, 'nur die aktuelle Kopfzeile bleibt');
  } finally { temp.close(); }
});

test('Fehlgeschlagener Download erzeugt keinen scheinbar erfolgreichen leeren Export', async () => {
  const temp = temporary();
  try {
    await assert.rejects(exportCentralSessions({ url: 'https://db.example.org', serviceKey: 'sb_secret_test', out: path.join(temp.dir, 'out'), fetchFn: async () => ({ ok: false, status: 401 }) }), /HTTP 401/);
    assert.equal(existsSync(path.join(temp.dir, 'out')), false);
  } finally { temp.close(); }
});
