// Ereignistypen im Event-Log (A8: einzige Quelle der Wahrheit).
//
// ANSWER            Antwort beim Wischen (response: DISLIKE … INTOLERANT) oder Rückgängig (response: UNDO).
//                   Ältere Ereignisse ohne `type` gelten als ANSWER.
// RATING_CHANGED    Bewertung im Profil geändert: { cardId, rating: DISLIKE | LIKE | PREFER | null, previousRating }
//                   null heisst „aus dem Profil entfernt“. Die ursprüngliche Swipe-Antwort bleibt im Log.
// EXCLUSION_ADDED   Ausschluss im Profil hinzugefügt: { section, exclusions: [{ type, value, label?, origin? }] }
// EXCLUSION_REMOVED Ausschluss im Profil entfernt: { section, exclusions: [{ type, value }] }
// DIET_CHANGED      Ernährungsweise im Profil geändert: { diet, previousDiet }
//                   Bestätigt jemand eine Vermutung der App im Profil, steht dabei fromPrediction: true und
//                   predictedScore (die Vermutung vorher); die Karte gilt danach als direkt bewertet.
// AUTH_STARTED      Registrierung begonnen (Vorname eingeben), AUTH_COMPLETED: SMS-Code bestätigt.
//                   Damit lässt sich die Dauer der Registrierung getrennt von der Swipe-Dauer auswerten.
// QUESTION_ABORTED  „Runde beenden“, während eine Karte zu sehen war (nurec v0.2, Kap. 6: Abbruch protokollieren):
//                   { cardId, stage, round, positionInRound, selectionReason, ruleVersion }
// PRACTICAL_SAVED   Alltagsprofil gespeichert (Kap. 2.3, freiwillig): { practical }. Es gilt das letzte Ereignis.
// HOLDOUT_DRAWN     Kontrollkarten gezogen (nach „Stimmt so“): { cardIds, method, eligible }. Diese Karten
//                   kommen erst am Ende von Runde 2, der Untergruppenebene (Messkonzept).
//                   Es gilt das letzte Ereignis dieses Typs.
// NAVIGATION        Navigation, keine Antwort (Dozentenfeedback 19.10.2026, Verbesserung 7):
//                   { action: 'overview_open' | 'overview_close' | 'round_resume', round }. Replay, Profil und
//                   Antwortzeiten ignorieren sie; die Antwortzeit pausiert, solange die Übersicht offen ist.
// Profiländerungen tragen immer source = "profile".

export const ANSWER = 'ANSWER';
export const RATING_CHANGED = 'RATING_CHANGED';
export const EXCLUSION_ADDED = 'EXCLUSION_ADDED';
export const EXCLUSION_REMOVED = 'EXCLUSION_REMOVED';
export const DIET_CHANGED = 'DIET_CHANGED';
export const AUTH_STARTED = 'AUTH_STARTED';
export const AUTH_COMPLETED = 'AUTH_COMPLETED';
export const HOLDOUT_DRAWN = 'HOLDOUT_DRAWN';
export const QUESTION_ABORTED = 'QUESTION_ABORTED';
export const PRACTICAL_SAVED = 'PRACTICAL_SAVED';
export const NAVIGATION = 'NAVIGATION';
export const NAVIGATION_ACTIONS = { OVERVIEW_OPEN: 'overview_open', OVERVIEW_CLOSE: 'overview_close', ROUND_RESUME: 'round_resume' };

// Phase einer Antwort beim Wischen (Feld phase im ANSWER-Ereignis)
export const PHASE_MAIN = 'main';
export const PHASE_HOLDOUT = 'holdout';
export const PHASE_DISH = 'dish';

export const PROFILE_EVENTS = [RATING_CHANGED, EXCLUSION_ADDED, EXCLUSION_REMOVED, DIET_CHANGED];
export const SOURCE_PROFILE = 'profile';

export function eventType(event) {
  return event?.type ?? ANSWER;
}

export function isProfileEvent(event) {
  return PROFILE_EVENTS.includes(eventType(event)) && event.source === SOURCE_PROFILE;
}
