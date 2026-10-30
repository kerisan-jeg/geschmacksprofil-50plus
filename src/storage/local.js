// Lokaler Speicher für die Person auf diesem Gerät. Alles bleibt im Browser (localStorage).
//
// Getrennt von den Sitzungen für die Auswertung (logging/logger.js, Präfix „geschmacksprofil:session:“):
//   geschmacksprofil:account  Vorname (seit dem 28.10.2026 ohne Handynummer).
//   geschmacksprofil:app      Stand der App (Fragebogen, Event-Log, Bildschirm), damit nach einem
//                             Neuladen oder beim nächsten Öffnen dort weitergeht, wo die Person war.
// Der Vorname bleibt hier; in der Sitzung steht er nur mit PRIVACY.logParticipantName (seit dem 29.10.2026 aus).

export const ACCOUNT_KEY = 'geschmacksprofil:account';
export const APP_STATE_KEY = 'geschmacksprofil:app';
const APP_STATE_VERSION = 1;

function store() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readJson(key) {
  try {
    const raw = store()?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    store()?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key) {
  try {
    store()?.removeItem(key);
  } catch {
    // Speicher gesperrt: nichts zu löschen.
  }
}

// Konto: { firstName }. Mehr wird nicht gespeichert (keine Handynummer).
export function saveAccount({ firstName = '' }) {
  return writeJson(ACCOUNT_KEY, { firstName: String(firstName).slice(0, 30) });
}

export function loadAccount() {
  const account = readJson(ACCOUNT_KEY);
  return account && typeof account.firstName === 'string' ? account : null;
}

export function clearAccount() {
  remove(ACCOUNT_KEY);
}

// Stand der App. Nur Felder, die zum Weitermachen nötig sind; die laufende Eingabe des Vornamens nicht.
const PERSISTED = ['screen', 'tab', 'config', 'person', 'answers', 'step', 'editing', 'onboarding', 'events', 'roundNumber', 'roundMode', 'dishRound', 'endedEarly', 'surveyDone'];

export function saveAppState(state, sessionId) {
  const snapshot = Object.fromEntries(PERSISTED.map((key) => [key, state[key]]));
  return writeJson(APP_STATE_KEY, { version: APP_STATE_VERSION, sessionId, savedAt: new Date().toISOString(), state: snapshot });
}

export function loadAppState() {
  const saved = readJson(APP_STATE_KEY);
  if (!saved || saved.version !== APP_STATE_VERSION || !saved.state) return null;
  return saved;
}

export function clearAppState() {
  remove(APP_STATE_KEY);
}

// Abmelden bzw. neue Testperson: Konto und Stand löschen. Sitzungen für die Auswertung bleiben.
export function signOutLocally() {
  clearAccount();
  clearAppState();
}
