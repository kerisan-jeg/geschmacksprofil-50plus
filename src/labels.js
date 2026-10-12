// Alle Beschriftungen, die im Pilot geprüft werden, an genau einer Stelle (A3).
// Komponenten importieren von hier und schreiben diese Texte nie selbst ins JSX.
// Ein Test (labels.test.js) prüft, dass die Antwortbegriffe nirgends sonst im JSX stehen.

// Antworten auf einer Karte. Intern bleiben DISLIKE / LIKE / PREFER / UNFAMILIAR / INTOLERANT.
// Begründung [V]: symmetrisch, kurz, nah an Dislike/Like/Superlike aus dem Kickoff [K];
// „Eher ungern“ war beim Zwischencheck unklar.
export const ANSWER_LABELS = {
  DISLIKE: 'Mag ich nicht',
  LIKE: 'Mag ich',
  PREFER: 'Mag ich sehr',
  UNFAMILIAR: 'Kenne ich nicht',
  INTOLERANT: 'Vertrage ich nicht',
};

export const ANSWER_HINTS = {
  DISLIKE: 'Nach links wischen oder tippen',
  LIKE: 'Nach rechts wischen oder tippen',
  PREFER: 'Nach oben wischen oder tippen',
  UNFAMILIAR: 'Tippen, wenn du es nicht kennst',
  INTOLERANT: 'Unter den Knöpfen tippen, wenn du es nicht verträgst. Das ist etwas anderes als „Mag ich nicht“.',
};

// Während der Runde
export const ROUND = {
  undo: 'Rückgängig',
  endRound: 'Runde beenden',
  cardOf: (position, total) => ({ strong: `Karte ${position}`, rest: ` von ${total}` }),
  // Bestätigung nach „Vertrage ich nicht“ (A4)
  intolerantToast: (names) => `Wir schlagen dir ${names} nicht mehr vor.`,
  intolerantPickerTitle: 'Was verträgst du nicht?',
  intolerantPickerIntro: (title) => `Aus „${title}“. Wähle die ganze Gruppe oder nur einzelne Einträge.`,
  intolerantAll: (title) => `Ganze Gruppe: ${title}`,
};

// Mini-Tutorial
export const TUTORIAL = {
  title: 'So antwortest du',
  lead: 'Wische die Karte in eine Richtung oder tippe auf den passenden Knopf. Beides zählt gleich.',
  noWrong: (dislike) => `Es gibt keine falschen Antworten. „${dislike}“ ist kein Verbot: Ausnahmen fragen wir später gezielt nach.`,
  undo: 'Falsch gewischt? Mit „Rückgängig“ oben rechts holst du die Karte zurück.',
  start: 'Erste Karte zeigen',
};

// Zwischenstand
export const RESULT = {
  unfamiliar: 'Kennst du nicht',
  unrated: 'Noch offen',
  fromSwipe: 'beim Wischen',
};

// Onboarding (Stufe 0)
export const ONBOARDING = {
  showMore: (count) => `Weitere anzeigen (${count})`,
  showLess: 'Weniger anzeigen',
  searchAllergensLabel: 'Suchen',
  searchAllergensPlaceholder: 'z. B. Sellerie oder Tomate',
  selectedTitle: 'Deine Auswahl',
  removeChip: (text) => `${text} entfernen`,
  tileChooseDetail: 'Auswählen',
  tileCount: (count, total) => (count === total ? 'Alle' : `${count} von ${total}`),
  unsureMore: 'Ich bin mir nicht sicher, ob es weitere gibt',
  // A4: Satz bei gesetztem Unsicherheits-Flag. Das Flag selbst schliesst nichts aus.
  unsureHint: 'Merkst du beim Wischen, dass du etwas nicht verträgst, tippe auf «Vertrage ich nicht».',
  noResult: 'Kein Eintrag gefunden.',
  alreadyCovered: 'Das ist durch deine bisherigen Angaben schon ausgeschlossen.',
  addEntry: (text) => `„${text}“ eintragen`,
  add: 'Hinzufügen',
  // Wirkung eines eingetippten Eintrags ohne eigene Karte (z. B. „Tomate“), ehrlich formuliert
  entryEffect: 'Eingetippte Einträge zeigen wir nirgends mehr als Beispiel. Eine ganze Gruppe fällt dadurch nicht weg.',
  // Frage 3
  quickPicksTitle: 'Häufige Beispiele',
  searchNeverLabel: 'Anderes Lebensmittel suchen',
  searchNeverPlaceholder: 'z. B. Speck oder Tomate',
  matchedVia: (term) => `passt zu „${term}“`,
  brandsBlockTitle: 'Marken und Herkunft',
  brandsTitle: 'Marken, die du meidest',
  brandsPlaceholder: 'Marke',
  originsTitle: 'Herkunft, die du meidest',
  originsPlaceholder: 'Land, Region',
  brandsNotApplied: 'Wir speichern das für spätere Produktvorschläge. Auf die Karten hier hat es noch keine Wirkung.',
  noteChip: 'Notiz',
};

// Detailauswahl (Onboarding und „Vertrage ich nicht“ beim Wischen)
export const PICKER = {
  confirm: 'Übernehmen',
  cancel: 'Abbrechen',
  close: 'Schliessen',
  selectSection: (label) => `Alle ${label}`,
  nothingSelected: 'Bitte wähle mindestens einen Eintrag.',
};

// Zusammenfassung vor dem Wischen
export const SUMMARY = {
  notesTitle: 'Deine Notizen',
  brandsTitle: 'Für spätere Produktvorschläge',
  brands: (list) => `Marken: ${list.join(', ')}`,
  origins: (list) => `Herkunft: ${list.join(', ')}`,
};
