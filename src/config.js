// Zentrale Einstellungen des Prototyps.
// Alles, was im Pilot variiert werden soll (Wortlaut, Schwellen, Funktionen), steht hier.
// Gestaltung (Farben, Abstände, Animationsdauern) steht in src/theme/tokens.css.

export const APP_VERSION = '0.11.0-demo';

// Karten pro Runde, einschliesslich Gerichte in Runde 4. Fortschrittsanzeigen leiten ihre Werte davon ab.
export const ROUND_CARD_LIMIT = 13;
export const ROUND_FLOW = 'staged-v1';

// Vorgabe des Dozenten: höchstens vier Swipe-Runden, unabhängig vom Kartenlimit.
export const MAX_ROUNDS = 4;

// Kartenauswahl (src/logic/selection.js): 'adaptive' wählt je nach den bisherigen Antworten (nurec v0.2,
// Kap. 4 und 6), 'fixed' zeigt die feste Reihenfolge von Version 0.6 (Vergleich im Pilot, ?selection=fixed).
// Sitzungen ohne Angabe (vor Version 0.7) behalten die feste Reihenfolge.
export const SELECTION_MODE = 'adaptive';

// Kontrollkarten (Messkonzept, docs/messkonzept.md): So viele Untergruppen werden pro Person zu Beginn
// zufällig zurückgehalten und am Ende der Untergruppenrunde (Runde 2) abgefragt.
// Damit lässt sich prüfen, ob die Vermutungen der App stimmen. 0 schaltet sie ab (?holdout=0).
export const HOLDOUT_CARDS = 6;
export const HOLDOUT_RANGE = { min: 0, max: 10 };

// Bewertungsbegriffe in Runde 1 (Dozentenfeedback 19.10.2026, Verbesserung 3; Teamentscheid [V]):
//   3  Eher ungern / Eher gern / Sehr gern (Standard, Variante A)
//   2  Eher ungern / Eher gern (Variante B): Wischen nach oben und der Knopf „Sehr gern“ entfallen
// Die internen Antwortwerte bleiben DISLIKE, LIKE, PREFER; jedes Ereignis trägt labelShown und scaleVariant.
// Im Pilot über ?r1scale=2 umschaltbar, ohne neuen Build.
export const R1_SCALE = 3;
export const R1_SCALE_VALUES = [2, 3];

// Gewicht einer direkten Bewertung je Ebene (Stufe 1 Gruppe … Stufe 4 Gericht). TODO Team: Werte festlegen.
// Standard 1 auf allen Stufen = keine Wirkung. Zusammenspiel mit inheritFactor: docs/dozentenfeedback-2026-10-19.md.
export const STAGE_WEIGHTS = { 1: 1, 2: 1, 3: 1, 4: 1 };

// Negative Gruppe („Mag ich nicht“ bzw. „Eher ungern“) ist kein Ausschluss (Dozentenfeedback 19.10.2026).
// Wie stark sie die Priorität der Unterkarten senkt, entscheidet das Team. TODO Team: Variante wählen.
//   'last'  (a) Unterkarten kommen nach allen anderen Karten der Runde, nur wenn das Kartenlimit Platz lässt.
//           Einzige umgesetzte Variante (vorläufiger Platzhalter).
//   (b) Quote: pro negativer Gruppe höchstens N weitere Unterkarten (nicht umgesetzt).
//   (c) Abgeschwächte Rangzahl: Unterkarten werden mit einem Faktor nach hinten sortiert statt in einer
//       festen letzten Stufe (nicht umgesetzt).
export const NEGATIVE_GROUP_POLICY = 'last';
// Vorläufige Quote (Element von Variante b) innerhalb von 'last': In Runde 3 kommen je negativer Untergruppe höchstens
// so viele konkrete Lebensmittel, ganz am Schluss. TODO Team: Wert bestätigen oder ändern (0 = keine).
// Folge: Bei vielen Ablehnungen werden Runden 2 und 3 länger als vor dem 19.10. (nie über das Kartenlimit).
export const NEGATIVE_GROUP_QUOTA_STAGE3 = 2;

// Esskulturen (Dozentenfeedback 19.10.2026, Verbesserung 6): Eine Tendenz zu einer Küche erscheint im Profil erst ab so
// vielen bewerteten Gerichten dieser Küche. „Kenne ich nicht“ zählt nicht. TODO Team: Wert festlegen (Vorschlag 3).
export const CUISINE_MIN_RATED = 3;

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
  stageWeights: STAGE_WEIGHTS,
};

// Analytischer Erfassungsgrad (nurec v0.2, Anhang B2), keine Trefferquote. Der sichtbare Fortschritt der vier
// Runden wird separat in engine.js → creationProgress berechnet und nutzt diese Gewichte nicht.
// Punkte je Stufe nach dem Entwurf 35/30/35 [D]; stage3Target ist eine Annahme [V]: so viele konkrete Lebensmittel
// mit Bewertung geben die vollen 35 Punkte (kein Pflichtziel 100 %). Im Pilot anpassen.
export const PROFILE_PROGRESS = { stage1: 35, stage2: 30, stage3: 35, stage3Target: 12 };

// Mini-Tutorial vor der ersten Runde. Seit dem Teamentscheid vom 13.10. standardmässig aus:
// Nach der Zusammenfassung erscheint direkt die erste Karte. Der Code bleibt, damit es für einen
// Pilot-Vergleich wieder eingeschaltet werden kann (hier auf true setzen). Über die URL lässt es sich
// nicht einschalten.
export const TUTORIAL_ENABLED = false;

// Bilder auf den Karten (Addendum A15): 'photo' (Bild der Karte aus public/cards, sonst neutraler Platzhalter) oder
// 'illustration' (eigene Illustrationen).
// Uneinheitliche Bilder können die Bewertung verzerren (Annahme 5); so lassen sich beide Varianten
// im Pilot vergleichen. Der Wert steht in jeder Sitzung (config.imageStyle) und im CSV-Export.
export const IMAGE_STYLE = 'photo';

// Gruppenbilder (Wunsch des Teams vom 21.10.2026: Bilder auf allen Karten). Die 13 Gruppen der Runde 1 zeigen je drei
// Beispielfotos als ein Bild (groupImages in src/data/image-credits.json). Das ändert Verbesserung 4 aus dem
// Dozentenfeedback vom 19.10.2026 (Tibor: in Runde 1 keine Beispiele, auch nicht im Bild; dafür das neutrale Symbol).
// false: Gruppen zeigen wieder auf allen Karten den neutralen Teller. Im Protokoll unterscheidbar über imageSource
// (stock = Foto, own = Teller). Im Pilot vergleichen und mit Tibor besprechen (docs/dozentenfeedback-2026-10-19.md).
export const GROUP_IMAGES = true;

// Lädt ein Kartenbild länger, zeigt die Karte den neutralen Platzhalter (A15), und die Antwortzeit beginnt.
// Annahme [V]: 3 Sekunden; die nächsten zwei Karten werden vorgeladen, damit das selten nötig ist. Im Pilot prüfen.
export const IMAGE_LOAD_TIMEOUT_MS = 3000;

// Anmeldung nur mit dem Vornamen (Teamentscheid 28.10.2026): keine Handynummer, keine SMS. Der Vorname steht im
// Konto auf dem Gerät und, mit PRIVACY.logParticipantName, als participantName in der Sitzung für die Testleitung.
// false: Die App startet direkt beim Onboarding („Über dich“), der Vorname ist dort freiwillig.
export const AUTH_ENABLED = true;

// Standardwerte für den Testablauf (A10). URL-Parameter überschreiben sie, z. B.
//   ?limit=12          Karten pro Runde (ROUND_CARD_LIMIT), gültig 4 bis 15; Runde 4 (Gerichte) hat kein Limit
//   ?admin=1           Ansicht für die Testleitung (Export, Sitzungen)
//   ?selection=fixed   feste Reihenfolge statt adaptiver Auswahl (Vergleich)
//   ?holdout=4         Anzahl Kontrollkarten, gültig 0 bis 10 (0 = keine)
//   ?r1scale=2         Bewertungsbegriffe in Runde 1: 3 (Standard) oder 2
// ?tutorial wirkt seit dem 13.10. nicht mehr (Tutorial nur über TUTORIAL_ENABLED).
// Die effektiven Werte werden in jeder Sitzung gespeichert.
// Begründung [V]: Kernfrage 2 (Anzahl Abfragen) [A] soll im Test ohne neuen Build vergleichbar sein.
export const DEFAULT_CONFIG = {
  roundCardLimit: ROUND_CARD_LIMIT,
  roundFlow: ROUND_FLOW,
  tutorial: TUTORIAL_ENABLED, // Für bestehende Sitzungen und Exporte bleibt das Datenfeld erhalten.
  imageStyle: IMAGE_STYLE,
  auth: AUTH_ENABLED,
  selection: SELECTION_MODE,
  holdout: HOLDOUT_CARDS,
  r1scale: R1_SCALE,
};

export const ROUND_CARD_LIMIT_RANGE = { min: 4, max: 15 };

// Auch gespeicherte Sitzungen und direkte Aufrufer dürfen die absolute Obergrenze nie umgehen.
export function cardLimit(config = {}) {
  const requested = Number(config.roundCardLimit);
  return Number.isInteger(requested) && requested > 0 ? Math.min(requested, ROUND_CARD_LIMIT_RANGE.max) : ROUND_CARD_LIMIT;
}

export function normalizeConfig(config = {}) {
  const migrated = { ...DEFAULT_CONFIG, ...config, roundFlow: ROUND_FLOW };
  if (!config.roundFlow && config.roundCardLimit === 10) migrated.roundCardLimit = ROUND_CARD_LIMIT;
  migrated.roundCardLimit = cardLimit(migrated);
  return migrated;
}

function integerParam(params, name, { min, max }) {
  const raw = params.get(name);
  if (raw === null || !/^\d+$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return value >= min && value <= max ? value : null;
}

// Ungültige Werte fallen auf den Standard zurück. Damit das nicht unbemerkt bleibt, stehen ignorierte Parameter
// in ignoredParams (nur wenn es welche gibt), werden mit der Sitzung gespeichert und in der Admin-Ansicht gezeigt.
export function resolveConfig(search = '') {
  const params = new URLSearchParams(search);
  const config = { ...DEFAULT_CONFIG };
  const ignored = [];
  const ignore = (name) => params.has(name) && ignored.push({ name, value: params.get(name) });

  const limit = integerParam(params, 'limit', ROUND_CARD_LIMIT_RANGE);
  if (limit !== null) config.roundCardLimit = limit;
  else ignore('limit');

  const selection = params.get('selection');
  if (selection === 'fixed' || selection === 'adaptive') config.selection = selection;
  else ignore('selection');

  const holdout = integerParam(params, 'holdout', HOLDOUT_RANGE);
  if (holdout !== null) config.holdout = holdout;
  else ignore('holdout');

  const r1scale = params.get('r1scale')?.trim();
  if (R1_SCALE_VALUES.map(String).includes(r1scale)) config.r1scale = Number(r1scale);
  else ignore('r1scale');

  // ?tutorial wirkt seit dem 13.10. nicht mehr
  ignore('tutorial');

  if (ignored.length > 0) config.ignoredParams = ignored;
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

// Datenschutz im Protokoll.
// Seit dem Addendum (A9) speichert jede Sitzung die Ausschlüsse mit source, also z. B. welche Allergie
// jemand angegeben hat. Das sind Gesundheitsdaten; Einwilligung und Umgang (Frage F4) sind noch offen.
// Mit false werden statt der Werte nur Typ und Herkunft gespeichert (z. B. "allergen" aus "onboarding").
// Speisevorschriften (halal, koscher) werden standardmässig nicht protokolliert (Teamentscheid 19.10.2026): kleine
// Stichprobe, möglicher Rückschluss auf Religion, kaum Nutzen für die Auswertung (docs/dozentenfeedback-2026-10-19.md).
// Die Wirkung bleibt: Bestätigte Ausschlüsse (z. B. Schweinefleisch) stehen wie alle Ausschlüsse im Protokoll.
// Vorname (Teamentscheid 28.10.2026): Die Anmeldung speichert den Vornamen als participantName in der Sitzung, damit
// die Testleitung die Sitzung einer Person zuordnen kann. Das ist ein Personendatum; die Einwilligung muss es nennen.
// Mit false bleibt der Vorname nur im Konto auf dem Gerät und fehlt in Sitzung und Export.
export const PRIVACY = {
  logExclusionValues: true,
  logDietaryRules: false,
  logParticipantName: true,
};
