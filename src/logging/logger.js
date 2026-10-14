// Protokoll pro Testperson (A9). Gespeichert wird nur im Browser (localStorage), es gibt kein
// Backend und keine Netzwerkanfrage. Jeder Speicherzugriff steht in try/catch: Ist der Speicher
// nicht verfügbar (z. B. privater Modus), bleibt die Sitzung im Arbeitsspeicher und die App läuft weiter.
//
// Sitzung:  sessionId, participantCode, startedAt, endedAt, appVersion, ruleVersion, config,
//           onboarding { ageGroup, diet, exclusions (mit source), uncertaintyFlag, freeTextNotes,
//                        avoidBrands, avoidOrigins },
//           profile (aktuell angezeigt), events (Antworten inkl. INTOLERANT und UNDO, Profiländerungen,
//           AUTH_STARTED/AUTH_COMPLETED), trace (Bildschirme).
// Ereignis: sessionId, cardId, stage, parentId, positionInRound, response, timestamp,
//           responseTimeMs, inputMethod, selectionReason (+ excludedCardIds, ruleVersion).
// Datenschutz: Vorname und Telefonnummer gelangen nie hierher (sie stehen nur im Konto auf dem Gerät,
// siehe storage/local.js). Exportiert werden nur sessionId und optional die Teilnehmer-Nr.

import { APP_VERSION, PRIVACY } from '../config.js';
import { RULE_VERSION } from '../logic/engine.js';

export const STORAGE_PREFIX = 'geschmacksprofil:session:';

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// Fehlerzustand für den Start: Ist Speichern gesperrt (z. B. privater Modus mit voller Sperre),
// läuft die App trotzdem, sagt es aber ehrlich.
export function storageAvailable() {
  const store = storage();
  if (!store) return false;
  try {
    const key = 'geschmacksprofil:probe';
    store.setItem(key, '1');
    store.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function newSessionId() {
  try {
    const raw = globalThis.crypto?.randomUUID?.();
    if (raw) return raw.replace(/-/g, '').slice(0, 12);
  } catch {
    // weiter unten
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function listSessions() {
  const store = storage();
  if (!store) return [];
  const sessions = [];
  try {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      try {
        sessions.push(JSON.parse(store.getItem(key)));
      } catch {
        // beschädigter Eintrag: überspringen
      }
    }
  } catch {
    return [];
  }
  return sessions.sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

export function deleteAllSessions() {
  const store = storage();
  if (!store) return 0;
  try {
    const keys = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
    return keys.length;
  } catch {
    return 0;
  }
}

function exclusionForLog(entry) {
  const { type, value, source, origin, label } = entry;
  // Marken und Herkunft sind keine Ausschlüsse und erscheinen separat.
  return PRIVACY.logExclusionValues ? { type, value, source, origin: origin ?? null, label: label ?? null } : { type, source };
}

function loadSession(sessionId) {
  try {
    const raw = storage()?.getItem(STORAGE_PREFIX + sessionId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Ausschlüsse in Profiländerungen wie im Onboarding behandeln (PRIVACY.logExclusionValues).
function eventForLog(event) {
  if (!event.exclusions || PRIVACY.logExclusionValues) return event;
  return { ...event, exclusions: event.exclusions.map(({ type }) => ({ type })) };
}

// resumeSessionId: Sitzung nach einem Neuladen fortsetzen (gleiche Person, gleiches Protokoll).
// seedEvents: Ereignisse aus dem gespeicherten Stand, falls die Sitzung noch nicht gespeichert war
// (z. B. Neuladen zwischen Registrierung und Einwilligung), damit AUTH_STARTED nicht verloren geht.
export function createLogger(config, { resumeSessionId = null, seedEvents = [] } = {}) {
  const existing = resumeSessionId ? loadSession(resumeSessionId) : null;
  const session = existing ?? {
    sessionId: resumeSessionId ?? newSessionId(),
    participantCode: null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    appVersion: APP_VERSION,
    ruleVersion: RULE_VERSION,
    config: { ...config },
    onboarding: null,
    profile: null,
    events: [],
    trace: [],
  };
  if (!existing && seedEvents.length > 0) session.events = seedEvents.map((event) => eventForLog({ ...event, sessionId: session.sessionId }));
  // Erst speichern, wenn sich jemand angemeldet hat: So entstehen keine leeren Sitzungen.
  let stored = Boolean(existing);

  function persist() {
    if (!stored) return;
    try {
      storage()?.setItem(STORAGE_PREFIX + session.sessionId, JSON.stringify(session));
    } catch {
      // Speicher voll oder gesperrt: Sitzung bleibt im Arbeitsspeicher.
    }
  }

  return {
    session,
    // Anmeldung: Teilnehmer-Nr. (optional, von der Testleitung) und Altersgruppe. Nie den Vornamen übergeben.
    start({ participantCode, ageGroup }) {
      session.participantCode = participantCode || null;
      session.onboarding = { ...(session.onboarding ?? {}), ageGroup: ageGroup ?? null };
      stored = true;
      persist();
    },
    setOnboarding(onboarding) {
      session.onboarding = {
        ageGroup: session.onboarding?.ageGroup ?? null,
        diet: onboarding.diet ?? null,
        exclusions: onboarding.exclusions.map(exclusionForLog),
        uncertaintyFlag: onboarding.uncertain,
        freeTextNotes: [...onboarding.freeTextNotes],
        avoidBrands: [...(onboarding.avoidBrands ?? [])],
        avoidOrigins: [...(onboarding.avoidOrigins ?? [])],
      };
      persist();
    },
    // Dasselbe Objekt, das auch in den Zustand der App geht (Event-Log als einzige Quelle).
    recordEvent(event) {
      const logged = { sessionId: session.sessionId, ...event };
      session.events.push(eventForLog(logged));
      persist();
      return logged;
    },
    trace(type, data = {}) {
      session.trace.push({ type, at: new Date().toISOString(), ...data });
      persist();
    },
    finish(profile) {
      session.endedAt = new Date().toISOString();
      session.profile = { ...profile, exclusions: (profile.exclusions ?? []).map(exclusionForLog) };
      persist();
    },
    // Profil nach Änderungen in „Mein Profil“ aktuell halten, ohne das Ende der Runde zu verschieben.
    updateProfile(profile) {
      session.profile = { ...profile, exclusions: (profile.exclusions ?? []).map(exclusionForLog) };
      persist();
    },
  };
}

export function downloadText(filename, text, type) {
  try {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Download nicht möglich: nichts tun.
  }
}
