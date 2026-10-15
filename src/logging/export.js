// Export der Sitzungen (A9). Reine Funktionen ohne Browser-Zugriff, damit sie testbar sind.

import { replay } from '../logic/engine.js';
import { HOLDOUT_DRAWN } from '../logic/events.js';

// Pflichtfelder pro Ereignis (A9) und Sitzungsangaben, die in jeder CSV-Zeile wiederholt werden.
export const EVENT_FIELDS = [
  'sessionId',
  'cardId',
  'stage',
  'parentId',
  'positionInRound',
  'response',
  'timestamp',
  'responseTimeMs',
  'inputMethod',
  'selectionReason',
];

// Seit Commit 3: Profiländerungen und Registrierung stehen im selben Log (type, source, …).
// Vorname und Telefonnummer gibt es in keiner Sitzung und damit in keiner Spalte.
// Seit Version 0.7: phase (main | holdout), Kontrollkarten (HOLDOUT_DRAWN mit cardIds), bestätigte Vermutungen
// (fromPrediction, predictedScore) und die Auswahl der Sitzung (selection, holdout).
// Seit Version 0.8: kind (Entitätstyp, nurec Kap. 8), phase dish (Gerichte), alternatives (nicht gezeigte Kandidaten,
// Anhang B3.2), QUESTION_ABORTED (Abbruch, Kap. 6) und PRACTICAL_SAVED (Alltagsprofil als JSON, Kap. 2.3).
export const CSV_COLUMNS = [
  ...EVENT_FIELDS,
  'round',
  'phase',
  'kind',
  'alternatives',
  'excludedCardIds',
  'cardIds',
  'ruleVersion',
  'type',
  'source',
  'rating',
  'previousRating',
  'fromPrediction',
  'predictedScore',
  'practical',
  'section',
  'exclusions',
  'newDiet',
  'previousDiet',
  'participantCode',
  'ageGroup',
  'diet',
  'uncertaintyFlag',
  'roundCardLimit',
  'tutorial',
  'imageStyle',
  'auth',
  'sms',
  'selection',
  'holdout',
  'appVersion',
  'sessionStartedAt',
  'sessionEndedAt',
];

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = Array.isArray(value) ? value.join('|') : String(value);
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Eine Zeile pro Ereignis, sessionId in jeder Zeile.
export function sessionsToCsv(sessions, { delimiter = ',' } = {}) {
  const rows = [CSV_COLUMNS.join(delimiter)];
  for (const session of sessions) {
    const shared = {
      participantCode: session.participantCode,
      ageGroup: session.onboarding?.ageGroup ?? null,
      diet: session.onboarding?.diet ?? null,
      uncertaintyFlag: session.onboarding?.uncertaintyFlag ?? null,
      roundCardLimit: session.config?.roundCardLimit,
      tutorial: session.config?.tutorial,
      imageStyle: session.config?.imageStyle ?? null,
      auth: session.config?.auth,
      sms: session.config?.sms ?? null,
      // Sitzungen vor Version 0.7: feste Reihenfolge, keine Kontrollkarten
      selection: session.config?.selection ?? 'fixed',
      holdout: session.config?.holdout ?? 0,
      appVersion: session.appVersion,
      sessionStartedAt: session.startedAt,
      sessionEndedAt: session.endedAt,
    };
    for (const event of session.events ?? []) {
      const row = {
        ...shared,
        ...event,
        type: event.type ?? 'ANSWER',
        // Antworten ohne Rundennummer stammen aus Runde 1 (vor Runde 2 protokolliert).
        round: event.round ?? ((event.type ?? 'ANSWER') === 'ANSWER' ? 1 : null),
        exclusions: (event.exclusions ?? []).map((exclusion) => [exclusion.type, exclusion.value].filter(Boolean).join(':')),
        newDiet: event.type === 'DIET_CHANGED' ? event.diet : null,
        practical: event.practical ? JSON.stringify(event.practical) : null,
        diet: shared.diet,
        sessionId: session.sessionId,
      };
      rows.push(CSV_COLUMNS.map((column) => csvCell(row[column])).join(delimiter));
    }
  }
  return `${rows.join('\r\n')}\r\n`;
}

export function sessionsToJson(sessions) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), sessions }, null, 2);
}

export function summarizeSession(session) {
  const events = session.events ?? [];
  const durationMs = session.endedAt ? new Date(session.endedAt) - new Date(session.startedAt) : null;
  const played = replay(events);
  const holdout = events.filter((event) => event.type === HOLDOUT_DRAWN).at(-1)?.cardIds ?? [];
  return {
    sessionId: session.sessionId,
    participantCode: session.participantCode ?? null,
    startedAt: session.startedAt,
    finished: Boolean(session.endedAt),
    durationMs,
    // Gültige Antworten nach dem Abspielen des Logs (rückgängig gemachte zählen nicht)
    answers: played.sequence.length,
    undos: events.filter((event) => event.response === 'UNDO').length,
    // Kontrollkarten: beantwortet von gezogen (für die Testleitung: Wurde die Sitzung bis zum Ende gespielt?)
    checks: { answered: holdout.filter((id) => id in played.answers).length, drawn: holdout.length },
    config: session.config,
  };
}
