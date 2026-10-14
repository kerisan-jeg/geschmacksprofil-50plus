// Zentrale Einstellungen des Prototyps.
// Alles, was im Pilot variiert werden soll (Wortlaut, Schwellen, Funktionen), steht hier.
// Gestaltung (Farben, Abstände, Animationsdauern) steht in src/theme/tokens.css.

export const APP_VERSION = '0.6.0-demo';

// Karten pro Runde (ROUND_CARD_LIMIT). Fortschrittsanzeigen leiten ihre Werte davon ab.
export const ROUND_CARD_LIMIT = 10;

// Mini-Tutorial vor der ersten Runde. Seit dem Teamentscheid vom 13.10. standardmässig aus:
// Nach der Zusammenfassung erscheint direkt die erste Karte. Der Code bleibt, damit es für einen
// Pilot-Vergleich wieder eingeschaltet werden kann (hier auf true setzen). Über die URL lässt es sich
// nicht einschalten.
export const TUTORIAL_ENABLED = false;

// Bilder auf den Karten: 'photo' (Fotos aus public/images) oder 'illustration' (eigene Illustrationen).
// Uneinheitliche Bilder können die Bewertung verzerren (Annahme 5); so lassen sich beide Varianten
// im Pilot vergleichen. Der Wert steht in jeder Sitzung (config.imageStyle) und im CSV-Export.
export const IMAGE_STYLE = 'photo';

// Registrierung mit Vorname, Handynummer und SMS-Code (simuliert, siehe src/auth/MockAuthService.js).
// false: Die App startet direkt beim Onboarding („Über dich“), der Vorname ist dort freiwillig.
// Ob die Registrierung in der Nutzerstudie aktiv sein soll, ist offen (Aufwand vor dem Swipen).
// Der URL-Parameter ?auth=0|1 folgt mit der URL-Konfiguration (Commit 4).
export const AUTH_ENABLED = true;

// Standardwerte für den Testablauf (A10). URL-Parameter überschreiben sie, z. B.
//   ?limit=6           Karten pro Runde (ROUND_CARD_LIMIT), gültig 4 bis 30
//   ?admin=1           Ansicht für die Testleitung (Export, Sitzungen)
// ?tutorial wirkt seit dem 13.10. nicht mehr (Tutorial nur über TUTORIAL_ENABLED).
// Die effektiven Werte werden in jeder Sitzung gespeichert.
// Begründung [V]: Kernfrage 2 (Anzahl Abfragen) [A] soll im Test ohne neuen Build vergleichbar sein.
export const DEFAULT_CONFIG = {
  roundCardLimit: ROUND_CARD_LIMIT,
  tutorial: TUTORIAL_ENABLED, // Für bestehende Sitzungen und Exporte bleibt das Datenfeld erhalten.
  imageStyle: IMAGE_STYLE,
  auth: AUTH_ENABLED,
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

  return config;
}

export function isAdminMode(search = '') {
  return new URLSearchParams(search).get('admin') === '1';
}

// Beschriftungen stehen in src/labels.js.

// Wischgesten (reine Logik in src/logic/swipe.js). Eine Antwort zählt, wenn die Distanz erreicht ist
// oder die Karte schnell genug in eine Richtung geschnippt wird. Darunter springt die Karte zurück.
// Animationsdauern stehen als Tokens in src/theme/tokens.css (--duration-swipe-exit, --duration-card-enter).
export const SWIPE = {
  thresholdX: 110, // px seitlich
  thresholdUp: 90, // px nach oben
  flingVelocity: 0.55, // px pro ms
  flingMinDistance: 36, // px
  labelDeadZone: 0.12, // Anteil der Schwelle, ab dem die Beschriftung auf der Karte erscheint
};

// Simulierte SMS-Mitteilung: so lange bleibt sie oben stehen (ms), wenn niemand sie wegtippt.
export const SMS_BANNER_MS = 12000;

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
