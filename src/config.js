// Zentrale Einstellungen des Prototyps.
// Alles, was im Pilot variiert werden soll (Wortlaut, Schwellen, Funktionen), steht hier.

export const APP_VERSION = '0.4.0-demo';

// Standardwerte für den Testablauf (A10). URL-Parameter überschreiben sie, z. B.
//   ?limit=6           Karten pro Runde (ROUND_CARD_LIMIT), gültig 4 bis 30
//   ?tutorial=0        Mini-Tutorial aus (1 = an)
//   ?admin=1           Ansicht für die Testleitung (Export, Sitzungen)
// Die effektiven Werte werden in jeder Sitzung gespeichert.
// Begründung [V]: Kernfrage 2 (Anzahl Abfragen) [A] und die Frage, ob es das Tutorial braucht [K],
// sollen im Test ohne neuen Build vergleichbar sein.
export const DEFAULT_CONFIG = {
  roundCardLimit: 10,
  tutorial: true,
};

export const ROUND_CARD_LIMIT_RANGE = { min: 4, max: 30 };

// Ungültige Werte fallen still auf den Standard zurück.
export function resolveConfig(search = '') {
  const params = new URLSearchParams(search);
  const config = { ...DEFAULT_CONFIG };

  const limit = params.get('limit');
  if (limit !== null && /^\d+$/.test(limit.trim())) {
    const value = Number(limit.trim());
    if (value >= ROUND_CARD_LIMIT_RANGE.min && value <= ROUND_CARD_LIMIT_RANGE.max) config.roundCardLimit = value;
  }

  const tutorial = params.get('tutorial');
  if (tutorial === '0') config.tutorial = false;
  else if (tutorial === '1') config.tutorial = true;

  return config;
}

export function isAdminMode(search = '') {
  return new URLSearchParams(search).get('admin') === '1';
}

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

// Datenschutz im Protokoll. Der Vorname wird nie gespeichert.
// Seit dem Addendum (A9) speichert jede Sitzung die Ausschlüsse mit source, also z. B. welche Allergie
// jemand angegeben hat. Das sind Gesundheitsdaten; Einwilligung und Umgang (Frage F4) sind noch offen.
// Mit false werden statt der Werte nur Typ und Herkunft gespeichert (z. B. "allergen" aus "onboarding").
export const PRIVACY = {
  logExclusionValues: true,
};
