// Export der Sitzungen (A9). Reine Funktionen ohne Browser-Zugriff, damit sie testbar sind.

import { replay } from '../logic/engine.js';

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

export const CSV_COLUMNS = [
  ...EVENT_FIELDS,
  'excludedCardIds',
  'ruleVersion',
  'participantCode',
  'ageGroup',
  'diet',
  'uncertaintyFlag',
  'roundCardLimit',
  'tutorial',
  'imageStyle',
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
      appVersion: session.appVersion,
      sessionStartedAt: session.startedAt,
      sessionEndedAt: session.endedAt,
    };
    for (const event of session.events ?? []) {
      const row = { ...shared, ...event, sessionId: session.sessionId };
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
  return {
    sessionId: session.sessionId,
    participantCode: session.participantCode ?? null,
    startedAt: session.startedAt,
    finished: Boolean(session.endedAt),
    durationMs,
    // Gültige Antworten nach dem Abspielen des Logs (rückgängig gemachte zählen nicht)
    answers: replay(events).sequence.length,
    undos: events.filter((event) => event.response === 'UNDO').length,
    config: session.config,
  };
}
