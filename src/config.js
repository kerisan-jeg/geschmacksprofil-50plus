// Zentrale Einstellungen des Prototyps.
// Alles, was im Pilot variiert werden soll (Wortlaut, Schwellen, Funktionen), steht hier.

export const APP_VERSION = '0.4.0-demo';

// Standardwerte für den Testablauf. Werden in Commit 3 durch URL-Parameter überschreibbar.
export const DEFAULT_CONFIG = {
  roundCardLimit: 10, // Karten pro Runde (Kernfrage 2: Anzahl Abfragen)
  tutorial: true, // Mini-Tutorial vor der ersten Runde
};

// Beschriftungen stehen in src/labels.js.

// Wischgesten. Eine Antwort zählt, wenn die Distanz erreicht ist
// oder die Karte schnell genug in eine Richtung geschnippt wird.
export const SWIPE = {
  thresholdX: 110, // px seitlich
  thresholdUp: 90, // px nach oben
  flingVelocity: 0.55, // px pro ms
  flingMinDistance: 36, // px
  exitMs: 280,
  enterMs: 320, // Einblendung der nächsten Karte (wie .swipe-card-inner in styles.css)
};

// Eigene Ideen, die im Pilot geprüft werden. Abschalten mit false.
// Rückgängig ist seit dem Zwischencheck fester Bestandteil (A8) und nicht mehr abschaltbar.
export const FEATURES = {
  haptics: true, // kurzes Vibrieren bei einer Antwort (nur Android)
};

// Datenschutz im Protokoll. Solange Einwilligung und Umgang mit Gesundheitsdaten nicht geklärt sind
// (Frage F4 an Tibor), speichert das Protokoll keine Rohantworten aus dem Fragebogen,
// also nicht, welche Allergie jemand hat. Es speichert nur die daraus abgeleiteten Karten-IDs,
// weil die Auswertung wissen muss, welche Karten gezeigt wurden. Der Vorname wird nie gespeichert.
export const PRIVACY = {
  logStage0Answers: false,
};
