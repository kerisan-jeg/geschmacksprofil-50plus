// Ereignistypen im Event-Log (A8: einzige Quelle der Wahrheit).
//
// ANSWER            Antwort beim Wischen (response: DISLIKE … INTOLERANT) oder Rückgängig (response: UNDO).
//                   Ältere Ereignisse ohne `type` gelten als ANSWER.
// RATING_CHANGED    Bewertung im Profil geändert: { cardId, rating: DISLIKE | LIKE | PREFER | null, previousRating }
//                   null heisst „aus dem Profil entfernt“. Die ursprüngliche Swipe-Antwort bleibt im Log.
// EXCLUSION_ADDED   Ausschluss im Profil hinzugefügt: { section, exclusions: [{ type, value, label?, origin? }] }
// EXCLUSION_REMOVED Ausschluss im Profil entfernt: { section, exclusions: [{ type, value }] }
// DIET_CHANGED      Ernährungsweise im Profil geändert: { diet, previousDiet }
// AUTH_STARTED      Registrierung begonnen (Vorname eingeben), AUTH_COMPLETED: SMS-Code bestätigt.
//                   Damit lässt sich die Dauer der Registrierung getrennt von der Swipe-Dauer auswerten.
// Profiländerungen tragen immer source = "profile".

export const ANSWER = 'ANSWER';
export const RATING_CHANGED = 'RATING_CHANGED';
export const EXCLUSION_ADDED = 'EXCLUSION_ADDED';
export const EXCLUSION_REMOVED = 'EXCLUSION_REMOVED';
export const DIET_CHANGED = 'DIET_CHANGED';
export const AUTH_STARTED = 'AUTH_STARTED';
export const AUTH_COMPLETED = 'AUTH_COMPLETED';

export const PROFILE_EVENTS = [RATING_CHANGED, EXCLUSION_ADDED, EXCLUSION_REMOVED, DIET_CHANGED];
export const SOURCE_PROFILE = 'profile';

export function eventType(event) {
  return event?.type ?? ANSWER;
}

export function isProfileEvent(event) {
  return PROFILE_EVENTS.includes(eventType(event)) && event.source === SOURCE_PROFILE;
}
