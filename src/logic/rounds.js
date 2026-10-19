// Rundenübersicht (Dozentenfeedback 19.10.2026, Verbesserung 7). Reine Funktion, alles aus dem Event-Log abgeleitet.
//
// Je Runde: status (roundStatus in engine.js), answered/total (Fortschritt der Runde), locked, canResume.
//   Noch offen     keine Antwort
//   Begonnen       Antworten, aber Karten offen, auch nach „Runde beenden“ (bleibt als QUESTION_ABORTED im Log)
//   Abgeschlossen  Kartenlimit erreicht oder keine Karte mehr, auch nach dem Fortsetzen
// Eine Runde ohne jede passende Karte (z. B. alle Gerichte ausgeschlossen) gilt als abgeschlossen (empty: true),
// sobald die Runden davor nicht mehr offen sind. Vorher ist sie gesperrt.
// Gesperrt: Eine frühere Runde ist noch offen (die Runden bauen aufeinander auf). Nach „Runde beenden“ ist die
// nächste Runde frei (Teamentscheid AP1). Fortsetzen: nur begonnene Runden, solange in einer späteren Runde noch
// nichts beantwortet ist (canResumeRound).

import { MAX_ROUNDS } from '../config.js';
import { canResumeRound, deriveRoundState, progress, ROUND_STATUS, roundStatus } from './engine.js';

export function roundOverview({ index, onboarding, diets, events = [], config = {} }) {
  const out = [];
  let earlierOpen = false;
  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    const state = deriveRoundState({ index, onboarding, diets, events, round });
    const raw = roundStatus(state, config);
    const locked = earlierOpen;
    const empty = !locked && raw === ROUND_STATUS.UNAVAILABLE;
    const status = locked && raw !== ROUND_STATUS.STARTED && raw !== ROUND_STATUS.COMPLETED ? ROUND_STATUS.OPEN : empty ? ROUND_STATUS.COMPLETED : raw;
    const { answered, total } = progress(state, config);
    out.push({ round, status, answered, total, locked, empty, canResume: !locked && canResumeRound(state, config) });
    if (status === ROUND_STATUS.OPEN) earlierOpen = true;
  }
  return out;
}
