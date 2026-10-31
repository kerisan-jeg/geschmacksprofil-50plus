// Verbindung und Zugriffsregeln mit künstlichen Sitzungen prüfen: npm run check:zentral.
// Verwendet dieselbe Übertragung wie die App. Keine echten Teilnehmerdaten werden ausgegeben.
// Ein optionaler SYNC_SERVICE_KEY löscht anschliessend ausschliesslich die hier erzeugten Testzeilen.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { createSync, sessionRow, SYNC_STATES } from '../src/sync/sync.js';
import { apiHeaders } from '../src/sync/headers.js';

try {
  loadEnvFile('.env.local');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const url = (process.env.VITE_SYNC_URL || process.env.SYNC_URL || '').trim().replace(/\/$/, '');
const key = (process.env.VITE_SYNC_KEY || '').trim();
const serviceKey = (process.env.SYNC_SERVICE_KEY || '').trim();
if (!url || !key) {
  console.error('Fehlt: VITE_SYNC_URL und VITE_SYNC_KEY. .env.example nach .env.local kopieren und ausfüllen.');
  process.exit(1);
}
// Der Test muss mit den eingeschränkten App-Rechten laufen, sonst könnte er fehlende RLS übersehen.
if (key.startsWith('sb_secret_') || key === serviceKey || legacyRole(key) === 'service_role') {
  console.error('VITE_SYNC_KEY muss ein öffentlicher Publishable-/anon-Schlüssel sein, kein Secret-/Service-Schlüssel.');
  process.exit(1);
}

function legacyRole(value) {
  try {
    return JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()).role;
  } catch {
    return null;
  }
}

const endpoint = `${url}/rest/v1/sessions`;
const ids = Array.from({ length: 3 }, () => `setup-check-${randomBytes(6).toString('hex')}`);
const session = (id) => ({
  sessionId: id,
  syncToken: randomBytes(16).toString('hex'),
  participantCode: 'SETUP_CHECK',
  participantName: null,
  appVersion: 'setup-check',
  startedAt: new Date().toISOString(),
  events: [],
});
const first = session(ids[0]);
const second = session(ids[1]);
const invalid = session(ids[2]);
let attemptedWrite = false;

const timedFetch = (input, init = {}) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) });
const sync = createSync({ url, key, store: null, fetchFn: timedFetch });
const headers = (token) => ({ ...apiHeaders(key), ...(token ? { 'x-session-token': token } : {}) });

async function read(query, token) {
  const response = await timedFetch(`${endpoint}?${query}`, { headers: headers(token) });
  assert.ok(response.ok, `Lesetest fehlgeschlagen: HTTP ${response.status}`);
  return response.json();
}

async function upsert(current) {
  attemptedWrite = true;
  const status = await sync.flush(current);
  assert.equal(status.state, SYNC_STATES.OK, `Speichern fehlgeschlagen (${status.lastError}). URL, Schlüssel und SQL-Einrichtung prüfen.`);
}

async function expectDenied(init, query = '') {
  const response = await timedFetch(`${endpoint}${query}`, init);
  assert.ok([401, 403].includes(response.status), `Zugriff sollte gesperrt sein, erhielt HTTP ${response.status}. Datenbankregeln prüfen.`);
  const body = await response.json();
  assert.equal(body.code, '42501', 'Erwartet ist eine Ablehnung durch die Datenbankrechte.');
}

try {
  await upsert(first);
  await upsert(second);
  first.events.push({ type: 'SETUP_CHECK', timestamp: new Date().toISOString() });
  first.survey = { ease: 4, clarity: 4, fit: 4, length: 3, remarks: null, submittedAt: new Date().toISOString() };
  await upsert(first);
  const own = await read(`id=eq.${first.sessionId}&select=id,events,finished,data`, first.syncToken);
  assert.equal(own.length, 1, 'Die eigene Testsitzung muss lesbar sein.');
  assert.equal(own[0].events, 1, 'Eine zweite Übertragung muss die bestehende Zeile aktualisieren.');
  assert.equal(own[0].finished, true, 'Die Abschlussbefragung muss angekommen sein.');
  assert.equal(own[0].data.survey.submittedAt, first.survey.submittedAt);
  console.log('OK: neue Sitzungen, Aktualisierung und Abschlussbefragung gespeichert.');

  assert.deepEqual(await read('select=id&limit=1'), [], 'Ohne Sitzungstoken dürfen keine Daten lesbar sein.');
  const visible = await read('select=id&limit=2', first.syncToken);
  assert.deepEqual(visible.map((row) => row.id), [first.sessionId], 'Mit einem Token darf nur die eigene Sitzung sichtbar sein.');
  assert.deepEqual(await read(`id=eq.${first.sessionId}&select=id`, second.syncToken), [], 'Fremde Sitzung ist lesbar.');

  await expectDenied({
    method: 'POST',
    headers: { ...headers(second.syncToken), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([sessionRow({ ...first, syncToken: second.syncToken })]),
  });
  await expectDenied({
    method: 'POST',
    headers: { ...headers(second.syncToken), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify([sessionRow(invalid)]),
  });
  await expectDenied({
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify([sessionRow(invalid)]),
  });
  await expectDenied({ method: 'DELETE', headers: headers(first.syncToken) }, `?id=eq.${first.sessionId}`);
  const unchanged = await read(`id=eq.${first.sessionId}&select=id,events`, first.syncToken);
  assert.equal(unchanged.length, 1, 'Die Sitzung muss nach den gesperrten Zugriffen erhalten bleiben.');
  assert.equal(unchanged[0].events, 1);
  console.log('OK: Lesen und Überschreiben fremder Sitzungen, Einfügen ohne passendes Token und Löschen gesperrt.');
} catch (error) {
  console.error(`Verbindungstest fehlgeschlagen: ${error.message}`);
  process.exitCode = 1;
} finally {
  sync.stop();
  if (attemptedWrite) {
    let cleaned = false;
    if (serviceKey) {
      try {
        const response = await timedFetch(`${endpoint}?id=in.(${ids.join(',')})`, { method: 'DELETE', headers: apiHeaders(serviceKey) });
        assert.ok(response.ok, `HTTP ${response.status}`);
        cleaned = true;
        console.log('Künstliche Testsitzungen wieder gelöscht.');
      } catch (error) {
        console.error(`Aufräumen fehlgeschlagen: ${error.message}`);
        process.exitCode = 1;
      }
    }
    if (!cleaned) console.log(`Diese künstlichen Zeilen gegebenenfalls im Table Editor löschen: ${ids.join(', ')}. Sie tragen app_version=setup-check.`);
  }
}
