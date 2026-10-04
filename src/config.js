// Zentrale Einstellungen des Prototyps.
// Alles, was im Pilot variiert werden soll (Wortlaut, Schwellen, Funktionen), steht hier.

export const APP_VERSION = '0.1.0-demo';

// Beschriftung der Antworten. Der Wortlaut von LIKE ist laut nurec v0.2 (Kap. 4)
// noch offen ("mag ich" oder "würde ich essen") und wird im Pilot geprüft.
export const ANSWER_LABELS = {
  DISLIKE: 'Eher ungern',
  LIKE: 'Gern',
  PREFER: 'Besonders gern',
  UNFAMILIAR: 'Kenne ich nicht',
};

// Wischgesten: Distanz in Pixeln, ab der eine Geste als Antwort zählt.
export const SWIPE = {
  thresholdX: 110,
  thresholdUp: 90,
  exitMs: 260,
};

// Eigene Ideen, die im Pilot geprüft werden. Abschalten mit false.
export const FEATURES = {
  undo: true,
};
