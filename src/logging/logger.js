// Protokoll aller Ereignisse einer Sitzung.
// Die Daten bleiben im Browser (localStorage), bis die Testleitung sie herunterlädt.
// Es wird nichts an einen Server gesendet.

import { APP_VERSION } from '../config.js';
import { RULE_VERSION } from '../logic/engine.js';

const STORAGE_PREFIX = 'geschmacksprofil:protokoll:';

function newSessionId() {
  const raw = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`;
  return raw.replace(/[^a-z0-9]/gi, '').slice(0, 12);
}

export function createLogger() {
  const session = {
    sessionId: newSessionId(),
    startedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    ruleVersion: RULE_VERSION,
    events: [],
  };

  function persist() {
    try {
      localStorage.setItem(STORAGE_PREFIX + session.sessionId, JSON.stringify(session));
    } catch {
      // Speicher nicht verfügbar (z. B. privater Modus): Protokoll bleibt im Arbeitsspeicher.
    }
  }

  return {
    log(type, data = {}) {
      session.events.push({ type, at: new Date().toISOString(), ...data });
      persist();
    },
    download() {
      const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `protokoll-${session.sessionId}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  };
}
