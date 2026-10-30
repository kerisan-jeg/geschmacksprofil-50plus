// Zentrale Speicherung (Vorschlag vom 29.10.2026, docs/zentrale-speicherung.md). Nach der Einwilligung überträgt die
// App die Sitzung laufend an eine zentrale Datenbank, damit das Team die Antworten erhält, ohne die Geräte der
// Testpersonen zu brauchen, und damit auch bei einem Abbruch Daten vorliegen. Ziel ist eine PostgREST-Schnittstelle
// (z. B. Supabase): ein Upsert je Sitzung in die Tabelle sessions. Ohne Adresse und Schlüssel (SYNC in src/config.js)
// passiert nichts; dann bleibt alles auf dem Gerät, und die Bildschirme sagen das.
//
// schedule(session) bündelt Änderungen (debounce), flush(session) überträgt sofort und wartet das Ergebnis ab.
// Misslingt eine Übertragung (offline, Serverfehler), bleibt die Sitzung offen (dirty) und wird mit wachsendem Abstand
// erneut versucht; lokal ist sie ohnehin gespeichert (logging/logger.js). Der Zustand ist beobachtbar (subscribe), und
// die letzte erfolgreiche Übertragung je Sitzung steht in localStorage (Admin-Ansicht, Abschluss nach einem Neuladen).
// Schutz: Jede Sitzung trägt ein zufälliges Token (syncToken). Die Datenbank erlaubt das Überschreiben einer Zeile nur
// mit demselben Token (Header x-session-token) und das Lesen nur mit dem Schlüssel des Teams (nie in der App).

export const SYNC_STATES = { OFF: 'off', IDLE: 'idle', PENDING: 'pending', SENDING: 'sending', OK: 'ok', ERROR: 'error' };
export const SYNC_RECORDS_KEY = 'geschmacksprofil:sync';
const RETRY_DELAYS_MS = [5000, 15000, 60000];

export function isSyncConfigured(sync) {
  return Boolean(sync?.url && sync?.key);
}

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// Letzte Übertragung je Sitzung: { okAt, error }. Für die Admin-Ansicht und den Abschluss nach einem Neuladen.
export function loadSyncRecords(store = storage()) {
  try {
    const raw = store?.getItem(SYNC_RECORDS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function rememberRecord(store, sessionId, changes) {
  if (!store || !sessionId) return;
  try {
    const records = loadSyncRecords(store);
    records[sessionId] = { ...(records[sessionId] ?? {}), ...changes };
    store.setItem(SYNC_RECORDS_KEY, JSON.stringify(records));
  } catch {
    // Speicher gesperrt: der Zustand bleibt im Arbeitsspeicher.
  }
}

// Zeile für die Datenbank: Kennzahlen als eigene Spalten, die ganze Sitzung als JSON (data), wie im lokalen Export.
export function sessionRow(session, now = new Date()) {
  return {
    id: session.sessionId,
    token: session.syncToken ?? null,
    participant_code: session.participantCode ?? null,
    app_version: session.appVersion ?? null,
    rule_version: session.ruleVersion ?? null,
    started_at: session.startedAt ?? null,
    ended_at: session.endedAt ?? null,
    finished: Boolean(session.survey?.submittedAt),
    events: session.events?.length ?? 0,
    updated_at: now.toISOString(),
    data: session,
  };
}

export function createSync({
  url = '',
  key = '',
  table = 'sessions',
  fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null,
  debounceMs = 1500,
  retryDelays = RETRY_DELAYS_MS,
  timers = globalThis,
  store = storage(),
  now = () => new Date(),
} = {}) {
  const enabled = Boolean(url && key && fetchFn);
  const endpoint = `${String(url).replace(/\/$/, '')}/rest/v1/${table}`;
  const status = { enabled, state: enabled ? SYNC_STATES.IDLE : SYNC_STATES.OFF, dirty: false, lastOkAt: null, lastError: null, attempts: 0 };
  const listeners = new Set();
  let latest = null;
  let version = 0;
  let timer = null;
  let inFlight = null;
  let retryIndex = 0;

  function set(changes) {
    Object.assign(status, changes);
    for (const listener of listeners) listener({ ...status });
  }

  function clearTimer() {
    if (timer !== null) timers.clearTimeout(timer);
    timer = null;
  }

  function scheduleTimer(ms) {
    clearTimer();
    timer = timers.setTimeout(() => {
      timer = null;
      run();
    }, ms);
  }

  async function send(session) {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
        'x-session-token': session.syncToken ?? '',
      },
      body: JSON.stringify([sessionRow(session, now())]),
    });
    if (!response?.ok) throw new Error(`HTTP ${response?.status ?? '?'}`);
  }

  // Überträgt den aktuellen Stand; ändert er sich währenddessen, folgt sofort eine weitere Übertragung.
  function run() {
    if (!enabled || !latest) return Promise.resolve({ ...status });
    if (inFlight) return inFlight;
    inFlight = (async () => {
      for (;;) {
        const current = version;
        const session = latest;
        set({ state: SYNC_STATES.SENDING });
        try {
          await send(session);
          retryIndex = 0;
          const okAt = now().toISOString();
          rememberRecord(store, session.sessionId, { okAt, error: null });
          if (version === current) {
            set({ state: SYNC_STATES.OK, dirty: false, lastOkAt: okAt, lastError: null, attempts: 0 });
            break;
          }
          set({ lastOkAt: okAt, lastError: null, attempts: 0 });
        } catch (error) {
          const message = String(error?.message ?? error);
          rememberRecord(store, session.sessionId, { error: message });
          set({ state: SYNC_STATES.ERROR, dirty: true, lastError: message, attempts: status.attempts + 1 });
          scheduleTimer(retryDelays[Math.min(retryIndex, retryDelays.length - 1)]);
          retryIndex += 1;
          break;
        }
      }
      inFlight = null;
      return { ...status };
    })();
    return inFlight;
  }

  return {
    enabled,
    getStatus: () => ({ ...status }),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // Änderung gemeldet (nach jedem Speichern im Logger): kurz sammeln, dann übertragen.
    schedule(session) {
      if (!enabled || !session) return;
      latest = session;
      version += 1;
      set({ dirty: true, state: inFlight ? SYNC_STATES.SENDING : SYNC_STATES.PENDING });
      scheduleTimer(debounceMs);
    },
    // Sofort übertragen (Abschluss, „Erneut senden“, wieder online) und das Ergebnis abwarten.
    async flush(session = null) {
      if (!enabled) return { ...status };
      if (session) {
        latest = session;
        version += 1;
        set({ dirty: true });
      }
      clearTimer();
      if (inFlight) await inFlight;
      clearTimer();
      return status.dirty || status.state !== SYNC_STATES.OK ? run() : { ...status };
    },
    stop() {
      clearTimer();
      listeners.clear();
    },
  };
}
