// Zentrale Einstellungen des Prototyps.
// Alles, was im Pilot variiert werden soll (Wortlaut, Schwellen, Funktionen), steht hier.
// Gestaltung (Farben, Abstände, Animationsdauern) steht in src/theme/tokens.css.

export const APP_VERSION = '0.7.0-demo';

// Karten pro Runde (ROUND_CARD_LIMIT). Fortschrittsanzeigen leiten ihre Werte davon ab.
export const ROUND_CARD_LIMIT = 10;

// Vorgabe des Dozenten: höchstens vier Swipe-Runden, unabhängig vom Kartenlimit.
export const MAX_ROUNDS = 4;

// Kartenauswahl (src/logic/selection.js): 'adaptive' wählt je nach den bisherigen Antworten (nurec v0.2,
// Kap. 4 und 6), 'fixed' zeigt die feste Reihenfolge von Version 0.6 (Vergleich im Pilot, ?selection=fixed).
// Sitzungen ohne Angabe (vor Version 0.7) behalten die feste Reihenfolge.
export const SELECTION_MODE = 'adaptive';

// Kontrollkarten (Messkonzept, docs/messkonzept.md): So viele Untergruppen werden pro Person zu Beginn
// zufällig zurückgehalten, nie in der Auswahl gezeigt und erst am Ende der letzten Runde abgefragt.
// Damit lässt sich prüfen, ob die Vermutungen der App stimmen. 0 schaltet sie ab (?holdout=0).
export const HOLDOUT_CARDS = 6;
export const HOLDOUT_RANGE = { min: 0, max: 10 };

// Präferenzmodell (src/logic/preferences.js). Annahmen [V], im Pilot zu prüfen und vor der Hauptstudie
// festzuschreiben (mit neuer RULE_VERSION):
//   weights        Wert einer direkten Bewertung
//   inheritFactor  Abschwächung pro Stufe, wenn eine Karte die Bewertung ihrer Gruppe erbt
//   siblingWeight  Gewicht bewerteter Geschwister (0 = aus; Variante für die Auswertung)
// Die Richtung einer Vermutung (mag / mag nicht) hängt bei siblingWeight 0 nur vom Vorzeichen ab,
// nicht von diesen Zahlen (siehe docs/messkonzept.md).
export const PREFERENCE_MODEL = {
  weights: { DISLIKE: -1, LIKE: 1, PREFER: 2 },
  inheritFactor: 0.5,
  siblingWeight: 0,
};

// Mini-Tutorial vor der ersten Runde. Seit dem Teamentscheid vom 13.10. standardmässig aus:
// Nach der Zusammenfassung erscheint direkt die erste Karte. Der Code bleibt, damit es für einen
// Pilot-Vergleich wieder eingeschaltet werden kann (hier auf true setzen). Über die URL lässt es sich
// nicht einschalten.
export const TUTORIAL_ENABLED = false;

// Bilder auf den Karten: 'photo' (Fotos aus public/images) oder 'illustration' (eigene Illustrationen).
// Uneinheitliche Bilder können die Bewertung verzerren (Annahme 5); so lassen sich beide Varianten
// im Pilot vergleichen. Der Wert steht in jeder Sitzung (config.imageStyle) und im CSV-Export.
export const IMAGE_STYLE = 'photo';

// Registrierung mit Vorname, Handynummer und SMS-Code (echte SMS über Firebase oder Simulation, siehe unten).
// false: Die App startet direkt beim Onboarding („Über dich“), der Vorname ist dort freiwillig.
// Ob die Registrierung in der Nutzerstudie aktiv sein soll, ist offen (Aufwand vor dem Swipen).
// Der URL-Parameter ?auth=0|1 folgt mit der URL-Konfiguration (Commit 4).
export const AUTH_ENABLED = true;

// Echte SMS über Firebase (src/auth/FirebaseAuthService.js), sobald das Projekt eingerichtet ist.
// Die Werte kommen beim Build aus VITE_FIREBASE_API_KEY, _AUTH_DOMAIN, _PROJECT_ID, _APP_ID (GitHub-Variablen
// bzw. .env.local), nie aus dem Code. Fehlen sie, läuft die Simulation (MockAuthService).
export function firebaseConfigFrom(env = {}) {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  return Object.values(config).every((value) => typeof value === 'string' && value.trim()) ? config : null;
}

export const FIREBASE_CONFIG = firebaseConfigFrom(import.meta.env ?? {});

// Standardwerte für den Testablauf (A10). URL-Parameter überschreiben sie, z. B.
//   ?limit=6           Karten pro Runde (ROUND_CARD_LIMIT), gültig 4 bis 30
//   ?admin=1           Ansicht für die Testleitung (Export, Sitzungen)
//   ?sms=sim           SMS-Code simulieren statt echt verschicken (z. B. für Testpersonen ohne Handy)
//   ?selection=fixed   feste Reihenfolge statt adaptiver Auswahl (Vergleich)
//   ?holdout=4         Anzahl Kontrollkarten, gültig 0 bis 10 (0 = keine)
// ?tutorial wirkt seit dem 13.10. nicht mehr (Tutorial nur über TUTORIAL_ENABLED).
// Die effektiven Werte werden in jeder Sitzung gespeichert.
// Begründung [V]: Kernfrage 2 (Anzahl Abfragen) [A] soll im Test ohne neuen Build vergleichbar sein.
export const DEFAULT_CONFIG = {
  roundCardLimit: ROUND_CARD_LIMIT,
  tutorial: TUTORIAL_ENABLED, // Für bestehende Sitzungen und Exporte bleibt das Datenfeld erhalten.
  imageStyle: IMAGE_STYLE,
  auth: AUTH_ENABLED,
  sms: FIREBASE_CONFIG ? 'firebase' : 'simulation', // echte SMS oder Simulation
  selection: SELECTION_MODE,
  holdout: HOLDOUT_CARDS,
};

export const ROUND_CARD_LIMIT_RANGE = { min: 4, max: 30 };

function integerParam(params, name, { min, max }) {
  const raw = params.get(name);
  if (raw === null || !/^\d+$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return value >= min && value <= max ? value : null;
}

// Ungültige Werte fallen still auf den Standard zurück.
export function resolveConfig(search = '') {
  const params = new URLSearchParams(search);
  const config = { ...DEFAULT_CONFIG };

  const limit = integerParam(params, 'limit', ROUND_CARD_LIMIT_RANGE);
  if (limit !== null) config.roundCardLimit = limit;

  if (params.get('sms') === 'sim') config.sms = 'simulation';

  const selection = params.get('selection');
  if (selection === 'fixed' || selection === 'adaptive') config.selection = selection;

  const holdout = integerParam(params, 'holdout', HOLDOUT_RANGE);
  if (holdout !== null) config.holdout = holdout;

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
