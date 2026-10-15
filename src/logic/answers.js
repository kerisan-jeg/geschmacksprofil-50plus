// Antworttypen und ihre Bedeutung (Semantik der Signale).
//
// Grundlage: nurec v0.2, Kap. 4 (DISLIKE, LIKE, PREFER, UNFAMILIAR, UNRATED) [D].
// Ergänzt um INTOLERANT („Vertrage ich nicht“) und UNDO (Rückgängig) [V], siehe Addendum A4 und A8.
// Die sichtbaren Beschriftungen stehen ausschliesslich in src/labels.js.
//
// Die Felder unter RESPONSE_SEMANTICS beschreiben, was eine Antwort bedeutet. Die Spalte `laterUse` hält
// fest, wofür das Signal gedacht ist; seit Version 0.7 setzt src/logic/selection.js das um (adaptive Auswahl).

export const DISLIKE = 'DISLIKE';
export const LIKE = 'LIKE';
export const PREFER = 'PREFER';
export const UNFAMILIAR = 'UNFAMILIAR';
export const INTOLERANT = 'INTOLERANT';

// Protokollereignis, kein Antworttyp: macht die letzte Antwort rückgängig.
export const UNDO = 'UNDO';

// Karte nie gezeigt oder nicht beantwortet. Keine Bewertung, kein Ereignis im Protokoll.
export const UNRATED = 'UNRATED';

export const RESPONSES = [DISLIKE, LIKE, PREFER, UNFAMILIAR, INTOLERANT];
export const LOG_RESPONSES = [...RESPONSES, UNDO];

// taste: Die Antwort ist ein Geschmackssignal und darf in ein Profil oder einen Score eingehen.
// hardExclusion: Die Antwort erzeugt einen harten Ausschluss, der über jedem Geschmack steht.
// countsTowardLimit: Die Antwort zählt als beantwortete Karte für das Rundenlimit.
export const RESPONSE_SEMANTICS = {
  [DISLIKE]: {
    taste: true,
    hardExclusion: false,
    countsTowardLimit: true,
    meaning: 'Überwiegend ungern. Kein Ausschluss: Ausnahmen bleiben möglich (nurec v0.2, Kap. 4).',
    laterUse: 'Eine plausible Ausnahme in Stufe 2 nachtesten (nurec v0.2, Kap. 6). Umgesetzt: selection.js, stage2_exception.',
  },
  [LIKE]: {
    taste: true,
    hardExclusion: false,
    countsTowardLimit: true,
    meaning: 'Grundsätzlich gern. Kein automatisches LIKE für jedes einzelne Mitglied.',
    laterUse: 'Ausgewählte Unterschiede vertiefen. Umgesetzt: selection.js, stage2_differentiate.',
  },
  [PREFER]: {
    taste: true,
    hardExclusion: false,
    countsTowardLimit: true,
    meaning: 'Besonders gern (im Kickoff „Superlike“). Macht nicht jedes Mitglied zum Favoriten.',
    laterUse: 'Konkrete Favoriten gezielt erfragen. Umgesetzt: selection.js, stage2_favorite und stage3_favorite.',
  },
  [UNFAMILIAR]: {
    taste: false,
    hardExclusion: false,
    countsTowardLimit: true,
    meaning: 'Keine Geschmacksbewertung. Die Gruppe bleibt unbekannt, sie ist kein neutrales „mag ich“.',
    laterUse: 'Sofort ein bekanntes Kind derselben Familie zeigen, höchstens zwei. Umgesetzt: selection.js, stage2_after_unfamiliar.',
  },
  [INTOLERANT]: {
    taste: false,
    hardExclusion: true,
    countsTowardLimit: true,
    meaning: 'Verträglichkeit, nicht Geschmack. Harter Ausschluss mit source = "swipe", kein Geschmacksscore.',
    laterUse: 'Wie Stufe 0: gilt für alle folgenden Runden.',
  },
};

// Reihenfolge der Gruppen im Zwischenstand. INTOLERANT erscheint nicht als Geschmack,
// sondern bei den festen Regeln.
export const ANSWER_ORDER = [PREFER, LIKE, DISLIKE, UNFAMILIAR];

export function isTasteSignal(response) {
  return RESPONSE_SEMANTICS[response]?.taste === true;
}
