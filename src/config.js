// Zentrale Einstellungen des Prototyps.
// Alles, was im Pilot variiert werden soll (Wortlaut, Schwellen, Funktionen), steht hier.

export const APP_VERSION = '0.3.0-demo';

// Beschriftung der Antworten. Der Wortlaut von LIKE ist laut nurec v0.2 (Kap. 4)
// noch offen ("mag ich" oder "würde ich essen") und wird im Pilot geprüft.
export const ANSWER_LABELS = {
  DISLIKE: 'Eher ungern',
  LIKE: 'Gern',
  PREFER: 'Besonders gern',
  UNFAMILIAR: 'Kenne ich nicht',
};

// Wischgesten. Eine Antwort zählt, wenn die Distanz erreicht ist
// oder die Karte schnell genug in eine Richtung geschnippt wird.
export const SWIPE = {
  thresholdX: 110, // px seitlich
  thresholdUp: 90, // px nach oben
  flingVelocity: 0.55, // px pro ms
  flingMinDistance: 36, // px
  exitMs: 280,
};

// Eigene Ideen, die im Pilot geprüft werden. Abschalten mit false.
export const FEATURES = {
  undo: true, // Rückgängig-Knopf
  haptics: true, // kurzes Vibrieren bei einer Antwort (nur Android)
};

// Datenschutz im Protokoll. Solange Einwilligung und Umgang mit Gesundheitsdaten nicht geklärt sind
// (Frage F4 an Tibor), speichert das Protokoll keine Rohantworten aus dem Fragebogen,
// also nicht, welche Allergie jemand hat. Es speichert nur die daraus abgeleiteten Karten-IDs,
// weil die Auswertung wissen muss, welche Karten gezeigt wurden. Der Vorname wird nie gespeichert.
export const PRIVACY = {
  logStage0Answers: false,
};
