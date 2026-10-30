// Zentrale Speicherung (29.10.2026): Übertragung gebündelt, sofort beim Abschluss, Wiederholung nach Fehlern, Token.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSync, isSyncConfigured, loadSyncRecords, sessionRow, SYNC_RECORDS_KEY, SYNC_STATES } from './sync.js';

function fakeStorage() {
  const data = new Map();
  return { getItem: (key) => (data.has(key) ? data.get(key) : null), setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) };
}

// Zeitgeber von Hand: run() führt fällige Aufrufe aus.
function fakeTimers() {
  const queue = new Map();
  let id = 0;
  return {
    setTimeout: (fn, ms) => {
      id += 1;
      queue.set(id, { fn, ms });
      return id;
    },
    clearTimeout: (handle) => queue.delete(handle),
    pending: () => [...queue.values()].map((entry) => entry.ms),
    async run() {
      const entries = [...queue.entries()];
      queue.clear();
      for (const [, entry] of entries) await entry.fn();
    },
  };
}

function fakeFetch(responses = []) {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const next = responses.length > 0 ? responses.shift() : { ok: true, status: 201 };
    if (next instanceof Error) throw next;
    return next;
  };
  return { fetchFn, calls };
}

const session = () => ({ sessionId: 'abc123', syncToken: 'tok-1', participantCode: 'T01', appVersion: '0.12.0-demo', ruleVersion: 'demo-0.8', startedAt: '2026-10-29T10:00:00.000Z', endedAt: null, events: [{ cardId: 'F01' }], survey: null });

test('Ohne Adresse und Schlüssel ist die Übertragung aus: kein Aufruf, Zustand off', async () => {
  const { fetchFn, calls } = fakeFetch();
  const sync = createSync({ url: '', key: '', fetchFn, store: fakeStorage() });
  assert.equal(sync.enabled, false);
  assert.equal(isSyncConfigured({ url: '', key: 'k' }), false);
  sync.schedule(session());
  assert.deepEqual(await sync.flush(session()), { ...sync.getStatus() });
  assert.equal(sync.getStatus().state, SYNC_STATES.OFF);
  assert.equal(calls.length, 0);
});

test('Änderungen werden gebündelt: zwei Meldungen, ein Upsert mit Token, Kennzahlen und der ganzen Sitzung', async () => {
  const { fetchFn, calls } = fakeFetch();
  const timers = fakeTimers();
  const store = fakeStorage();
  const sync = createSync({ url: 'https://db.example.org/', key: 'anon-key', fetchFn, timers, store, debounceMs: 1500, now: () => new Date('2026-10-29T10:05:00.000Z') });
  const current = session();
  sync.schedule(current);
  current.events.push({ cardId: 'F02' });
  sync.schedule(current);
  assert.equal(sync.getStatus().state, SYNC_STATES.PENDING);
  assert.deepEqual(timers.pending(), [1500], 'ein Zeitgeber, der zweite ersetzt den ersten');
  await timers.run();
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.equal(call.url, 'https://db.example.org/rest/v1/sessions');
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.headers.apikey, 'anon-key');
  assert.equal(call.init.headers.Authorization, 'Bearer anon-key');
  assert.equal(call.init.headers.Prefer, 'resolution=merge-duplicates,return=minimal');
  assert.equal(call.init.headers['x-session-token'], 'tok-1');
  const [row] = call.body;
  assert.equal(row.id, 'abc123');
  assert.equal(row.token, 'tok-1');
  assert.equal(row.participant_code, 'T01');
  assert.equal(row.finished, false);
  assert.equal(row.events, 2, 'der Stand beim Senden, nicht der erste');
  assert.equal(row.updated_at, '2026-10-29T10:05:00.000Z');
  assert.deepEqual(row.data, current);
  assert.equal(sync.getStatus().state, SYNC_STATES.OK);
  assert.equal(sync.getStatus().dirty, false);
  assert.equal(loadSyncRecords(store).abc123.okAt, '2026-10-29T10:05:00.000Z', 'letzte Übertragung je Sitzung gemerkt');
});

test('flush überträgt sofort und wartet; Befragung macht finished wahr', async () => {
  const { fetchFn, calls } = fakeFetch();
  const timers = fakeTimers();
  const sync = createSync({ url: 'https://db.example.org', key: 'k', fetchFn, timers, store: fakeStorage() });
  const current = { ...session(), survey: { ease: 5, clarity: 4, fit: 4, length: 2, remarks: null, submittedAt: '2026-10-29T10:20:00.000Z' } };
  const status = await sync.flush(current);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body[0].finished, true);
  assert.equal(status.state, SYNC_STATES.OK);
  assert.deepEqual(timers.pending(), [], 'kein offener Zeitgeber');
  assert.equal((await sync.flush()).state, SYNC_STATES.OK, 'nichts Neues: kein zweiter Aufruf');
  assert.equal(calls.length, 1);
});

test('Fehler: Zustand error, Wiederholung mit wachsendem Abstand, danach ok; der Fehler steht im Gedächtnis', async () => {
  const { fetchFn, calls } = fakeFetch([{ ok: false, status: 503 }, new Error('offline'), { ok: true, status: 201 }]);
  const timers = fakeTimers();
  const store = fakeStorage();
  const sync = createSync({ url: 'https://db.example.org', key: 'k', fetchFn, timers, store, retryDelays: [5000, 15000, 60000] });
  const first = await sync.flush(session());
  assert.equal(first.state, SYNC_STATES.ERROR);
  assert.equal(first.lastError, 'HTTP 503');
  assert.deepEqual(timers.pending(), [5000]);
  assert.equal(loadSyncRecords(store).abc123.error, 'HTTP 503');
  await timers.run();
  assert.equal(sync.getStatus().state, SYNC_STATES.ERROR);
  assert.equal(sync.getStatus().lastError, 'offline');
  assert.equal(sync.getStatus().attempts, 2);
  assert.deepEqual(timers.pending(), [15000], 'zweiter Versuch wartet länger');
  await timers.run();
  assert.equal(calls.length, 3);
  assert.equal(sync.getStatus().state, SYNC_STATES.OK);
  assert.equal(loadSyncRecords(store).abc123.error, null);
});

test('Ändert sich die Sitzung während der Übertragung, folgt sofort eine zweite Übertragung', async () => {
  let resolveFirst;
  const calls = [];
  const fetchFn = (url, init) =>
    new Promise((resolve) => {
      calls.push(JSON.parse(init.body)[0]);
      if (calls.length === 1) resolveFirst = () => resolve({ ok: true, status: 201 });
      else resolve({ ok: true, status: 201 });
    });
  const timers = fakeTimers();
  const sync = createSync({ url: 'https://db.example.org', key: 'k', fetchFn, timers, store: fakeStorage() });
  const current = session();
  const pending = sync.flush(current);
  current.events.push({ cardId: 'F03' });
  sync.schedule(current);
  assert.equal(sync.getStatus().state, SYNC_STATES.SENDING);
  resolveFirst();
  const status = await pending;
  assert.equal(calls.length, 2, 'zweite Übertragung mit dem neuen Stand');
  assert.equal(calls[1].events, 2);
  assert.equal(status.state, SYNC_STATES.OK);
  assert.equal(status.dirty, false);
});

test('Zeile für die Datenbank: Vorname fehlt standardmässig, die Sitzung steht vollständig in data', () => {
  const row = sessionRow({ ...session(), participantName: null }, new Date('2026-10-29T12:00:00.000Z'));
  assert.deepEqual(Object.keys(row), ['id', 'token', 'participant_code', 'app_version', 'rule_version', 'started_at', 'ended_at', 'finished', 'events', 'updated_at', 'data']);
  assert.equal(row.data.participantName, null);
  assert.equal(JSON.stringify(row).includes('Annelies'), false);
  const records = fakeStorage();
  records.setItem(SYNC_RECORDS_KEY, 'kaputt');
  assert.deepEqual(loadSyncRecords(records), {}, 'beschädigtes Gedächtnis: leer statt Absturz');
});
