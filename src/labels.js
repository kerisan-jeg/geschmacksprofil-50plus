// Alle Beschriftungen, die im Pilot geprüft werden, an genau einer Stelle (A3).
// Komponenten importieren von hier und schreiben diese Texte nie selbst ins JSX.

// Onboarding (Stufe 0)
export const ONBOARDING = {
  showMore: (count) => `Weitere anzeigen (${count})`,
  showLess: 'Weniger anzeigen',
  searchAllergensLabel: 'Suchen',
  searchAllergensPlaceholder: 'z. B. Sellerie oder Mandel',
  selectedTitle: 'Deine Auswahl',
  removeChip: (text) => `${text} entfernen`,
  tileChooseDetail: 'Auswählen',
  tileCount: (count, total) => (count === total ? 'Alle' : `${count} von ${total}`),
  unsureMore: 'Ich bin mir nicht sicher, ob es weitere gibt',
  // A4: Satz bei gesetztem Unsicherheits-Flag. Das Flag selbst schliesst nichts aus.
  unsureHint: 'Merkst du beim Wischen, dass du etwas nicht verträgst, tippe auf «Vertrage ich nicht».',
  noResult: 'Kein Eintrag gefunden.',
  // Frage 3 (A7)
  quickPicksTitle: 'Häufige Beispiele',
  searchNeverLabel: 'Anderes Lebensmittel suchen',
  searchNeverPlaceholder: 'z. B. Speck oder Tofu',
  matchedVia: (term) => `passt zu „${term}“`,
  addNote: (text) => `„${text}“ als Notiz hinzufügen`,
  noteNotApplied: 'Diesen Eintrag können wir noch nicht automatisch berücksichtigen.',
  noteChip: 'Notiz',
};

// Detailauswahl (Onboarding und „Vertrage ich nicht“ beim Wischen)
export const PICKER = {
  confirm: 'Übernehmen',
  cancel: 'Abbrechen',
  selectSection: (label) => `Alle ${label}`,
  nothingSelected: 'Bitte wähle mindestens einen Eintrag.',
};

// Zusammenfassung vor dem Wischen
export const SUMMARY = {
  notesTitle: 'Deine Notizen',
};
