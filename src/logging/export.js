// Export der Sitzungen (A9). Reine Funktionen ohne Browser-Zugriff, damit sie testbar sind.

import { replay } from '../logic/engine.js';
import { dietAnswer, isLegacyDiet } from '../logic/stage0.js';
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

// Seit Commit 3: Profiländerungen und Anmeldung stehen im selben Log (type, source, …).
// Seit Version 0.7: phase (main | holdout), Kontrollkarten (HOLDOUT_DRAWN mit cardIds), bestätigte Vermutungen
// (fromPrediction, predictedScore) und die Auswahl der Sitzung (selection, holdout).
// Seit Version 0.8: kind (Entitätstyp, nurec Kap. 8), phase dish (Gerichte), alternatives (nicht gezeigte Kandidaten,
// Anhang B3.2) und QUESTION_ABORTED (Abbruch, Kap. 6).
// Seit Version 0.10 (28.10.2026): participantName (Vorname aus der Anmeldung, für die Testleitung); die Spalten
// practical, uncertaintyFlag und sms gibt es nicht mehr (Alltagsprofil, Unsicherheits-Flag und SMS entfernt).
export const CSV_COLUMNS = [
  ...EVENT_FIELDS,
  'round',
  'phase',
  'labelShown',
  'scaleVariant',
  'cuisines',
  'imageShown',
  'imageSource',
  'kind',
  'alternatives',
  'excludedCardIds',
  'cardIds',
  'ruleVersion',
  'type',
  'action',
  'source',
  'rating',
  'previousRating',
  'fromPrediction',
  'predictedScore',
  'section',
  'exclusions',
  'newDiet',
  'previousDiet',
  'participantCode',
  'participantName',
  'ageGroup',
  'diet',
  'dietOriginal',
  'dietaryRules',
  'roundCardLimit',
  'tutorial',
  'imageStyle',
  'auth',
  'selection',
  'holdout',
  'r1scale',
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
      participantName: session.participantName ?? null,
      ageGroup: session.onboarding?.ageGroup ?? null,
      // Alte Sitzungen („Kein Schweinefleisch“ als Ernährungsweise): diet ist die Ernährungsform wie heute
      // gelesen, dietOriginal der damals gespeicherte Wert (nur bei solchen Sitzungen gefüllt).
      diet: isLegacyDiet(session.onboarding?.diet) ? dietAnswer(session.onboarding.diet).form : (session.onboarding?.diet ?? null),
      dietOriginal: isLegacyDiet(session.onboarding?.diet) ? session.onboarding.diet : null,
      dietaryRules: session.onboarding?.dietaryRules ?? null,
      roundCardLimit: session.config?.roundCardLimit,
      tutorial: session.config?.tutorial,
      imageStyle: session.config?.imageStyle ?? null,
      auth: session.config?.auth,
      // Sitzungen vor Version 0.7: feste Reihenfolge, keine Kontrollkarten
      selection: session.config?.selection ?? 'fixed',
      holdout: session.config?.holdout ?? 0,
      // Sitzungen vor dem Dozentenfeedback: keine eigenen Begriffe in Runde 1 (leer)
      r1scale: session.config?.r1scale ?? null,
      appVersion: session.appVersion,
      sessionStartedAt: session.startedAt,
      sessionEndedAt: session.endedAt,
    };
    // Sitzungen vor dem Dozentenfeedback (ohne r1scale): Bewertungen ohne scaleVariant gelten als "legacy".
    // Gespeichert wird nichts umgeschrieben, die Kennzeichnung entsteht nur im Export.
    const legacy = session.config?.r1scale === undefined;
    for (const event of session.events ?? []) {
      const type = event.type ?? 'ANSWER';
      const rating = (type === 'ANSWER' && event.response !== 'UNDO') || (type === 'RATING_CHANGED' && event.rating != null);
      const row = {
        ...shared,
        ...event,
        type,
        scaleVariant: event.scaleVariant ?? (legacy && rating ? 'legacy' : null),
        // Antworten ohne Rundennummer stammen aus Runde 1 (vor Runde 2 protokolliert).
        round: event.round ?? ((event.type ?? 'ANSWER') === 'ANSWER' ? 1 : null),
        exclusions: (event.exclusions ?? []).map((exclusion) => [exclusion.type, exclusion.value].filter(Boolean).join(':')),
        newDiet: event.type === 'DIET_CHANGED' ? event.diet : null,
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
    participantName: session.participantName ?? null,
    startedAt: session.startedAt,
    finished: Boolean(session.endedAt),
    durationMs,
    // Gültige Antworten nach dem Abspielen des Logs (rückgängig gemachte zählen nicht)
    answers: played.sequence.length,
    undos: events.filter((event) => event.response === 'UNDO').length,
    // Kontrollkarten: beantwortet von gezogen (für die Testleitung: Wurde die Sitzung bis zum Ende gespielt?)
    checks: { answered: holdout.filter((id) => id in played.answers).length, drawn: holdout.length },
    config: session.config,
    ignoredParams: session.config?.ignoredParams ?? [],
  };
}
