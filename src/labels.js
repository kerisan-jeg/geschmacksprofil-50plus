// Alle sichtbaren Texte an genau einer Stelle (A3).
// Komponenten importieren von hier und schreiben nie selbst Text ins JSX.
// labels.test.js prüft das: Antwortbegriffe und deutsche Texte dürfen in keiner .jsx-Datei stehen.
// Sprache: Du-Form, Schweizer Rechtschreibung (ss statt ß), kurze Sätze.
// Fragebogentexte (Fragen, Optionen) stehen als Daten in src/data/stage0.json.

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

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

export const APP = {
  name: 'Geschmacksprofil',
};

export const COMMON = {
  back: 'Zurück',
  next: 'Weiter',
  close: 'Schliessen',
  cancel: 'Abbrechen',
  skip: 'Überspringen',
};

// Untere Navigation
export const NAV = {
  label: 'Hauptnavigation',
  create: 'Profil erstellen',
  profile: 'Mein Profil',
};

// Abschnitte der Profilerstellung (Fortschritt)
export const STEPS = {
  label: 'Fortschritt der Profilerstellung',
  questions: 'Fragen',
  round: 'Runde 1',
  profile: 'Profil',
  state: { done: '(erledigt)', current: '(aktuell)', open: '(offen)' },
  detail: (answered, total) => `${answered} von ${total}`,
};

export const START = {
  title: 'Was isst du gern?',
  lead: 'Wir zeigen dir Lebensmittel auf Karten. Bei jeder Karte sagst du mit einem Wisch oder einem Tipp, wie gern du sie isst.',
  steps: ['Kurz anmelden', 'Drei Fragen zu Allergien und Ernährung', 'Karten wischen oder tippen'],
  pause: 'Aufhören kannst du jederzeit.',
  start: 'Los geht’s',
  fineprint: 'Prototyp aus einem Studierendenprojekt der ZHAW für nurec. Deine Antworten bleiben auf diesem Gerät.',
  storageBlocked: 'Dein Browser erlaubt hier kein Speichern. Die App funktioniert, aber beim Schliessen gehen deine Antworten verloren.',
};

// Anmeldung ohne Passwort (vor dem Fragebogen)
export const LOGIN = {
  title: 'Anmelden',
  lead: 'Damit wir dich persönlich ansprechen können. Ein Passwort brauchst du nicht.',
  firstName: 'Vorname',
  age: 'Alter',
  ageGroups: [
    { id: '50-59', label: '50 bis 59' },
    { id: '60-69', label: '60 bis 69' },
    { id: '70-79', label: '70 bis 79' },
    { id: '80+', label: '80 und älter' },
  ],
  consent: 'Ich bin einverstanden, dass meine Antworten ohne Namen für dieses Studierendenprojekt ausgewertet werden.',
  errorName: 'Bitte gib deinen Vornamen ein.',
  errorAge: 'Bitte wähle deine Altersgruppe.',
  errorConsent: 'Bitte bestätige die Einwilligung, damit es weitergehen kann.',
  leadDetails: 'Für die Testleitung',
  participantCode: 'Teilnehmer-Nr.',
  participantPlaceholder: 'z. B. T07',
  submit: 'Anmelden',
  privacy: 'Deine Angaben bleiben auf diesem Gerät.',
};

// Fragebogen Stufe 0
export const QUESTIONS = {
  counter: (position, total) => ({ strong: `Frage ${position}`, rest: ` von ${total}` }),
  progressLabel: 'Fortschritt der Fragen',
  hello: (name) => `Hallo ${name}!`,
  kicker: 'Bevor es losgeht',
  errorChoose: 'Bitte wähle eine Antwort aus.',
  errorDetails: 'Bitte wähle mindestens einen Punkt aus oder ändere die Antwort oben.',
  next: 'Weiter',
  toRound: 'Erste Karte zeigen',
};

// Onboarding (Stufe 0): Allergien und „Nie vorschlagen“
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

// Marken und Herkunft (Frage 3), wie sie in „Mein Profil“ zusammengefasst werden
export const BRANDS = {
  brands: (list) => `Marken: ${list.join(', ')}`,
  origins: (list) => `Herkunft: ${list.join(', ')}`,
};

// Mini-Tutorial: höchstens drei kurze Schritte. Standardmässig aus (TUTORIAL_ENABLED in config.js)
export const TUTORIAL = {
  skip: 'Überspringen',
  stepOf: (position, total) => `Schritt ${position} von ${total}`,
  steps: [
    {
      title: 'Wischen oder tippen',
      text: 'Wische die Karte in eine Richtung oder tippe auf den passenden Knopf darunter. Beides zählt gleich.',
    },
    {
      title: 'Nicht gekannt, nicht vertragen',
      text: 'Kennst du etwas nicht, tippe auf den Knopf darunter. Verträgst du etwas nicht, tippe auf den Link ganz unten: Dann schlagen wir es dir nie mehr vor.',
    },
    {
      title: 'Falsch gewischt?',
      text: 'Mit „Rückgängig“ oben rechts holst du die letzte Karte zurück.',
    },
  ],
  noWrong: (dislike) => `Es gibt keine falschen Antworten. „${dislike}“ ist kein Verbot: Ausnahmen fragen wir später gezielt nach.`,
  next: 'Weiter',
  start: 'Erste Karte zeigen',
  demoLabel: 'Beispielkarte',
};

// Während der Runde
export const ROUND = {
  undo: 'Rückgängig',
  endRound: 'Runde beenden',
  cardOf: (position, total) => ({ strong: `Karte ${position}`, rest: ` von ${total}` }),
  progressLabel: 'Fortschritt der Runde',
  progressText: (answered, total) => `${answered} von ${total} Karten beantwortet`,
  announce: (position, total, title) => `Karte ${position} von ${total}: ${title}`,
  cardRole: 'Karte',
  cardKind: 'Lebensmittelgruppe',
  examplesLabel: 'Zum Beispiel',
  cardDescription: ({ title, notes, examples }) =>
    [title, notes?.join(', '), examples.length > 0 && `Zum Beispiel ${examples.join(', ')}`].filter(Boolean).join('. '),
  // Bestätigung nach „Vertrage ich nicht“ (A4)
  intolerantToast: (names) => `Wir schlagen dir ${names} nicht mehr vor.`,
  intolerantPickerTitle: 'Was verträgst du nicht?',
  intolerantPickerIntro: (title) => `Aus „${title}“. Wähle die ganze Gruppe oder nur einzelne Einträge.`,
  intolerantAll: (title) => `Ganze Gruppe: ${title}`,
  listNames: (names) => {
    if (names.length <= 1) return names[0] ?? '';
    if (names.length <= 3) return `${names.slice(0, -1).join(', ')} und ${names.at(-1)}`;
    return `${names.slice(0, 2).join(', ')} und ${names.length - 2} weitere`;
  },
};

// Hinweise auf Karten, wenn Ausschlüsse Teile einer Familie betreffen (logic/filter.js)
export const CARD_NOTES = {
  without: (name) => `Ohne ${name}`,
  more: (count) => `und ${count} weitere`,
};

// Abschluss nach der Runde
export const COMPLETE = {
  kickerDone: 'Runde 1 abgeschlossen',
  kickerEnded: 'Runde beendet',
  title: (name) => (name ? `Danke, ${name}!` : 'Danke!'),
  leadDone: (count) => `Du hast alle ${plural(count, 'Karte', 'Karten')} dieser Runde beantwortet.`,
  leadEnded: (count) => `Du hast ${plural(count, 'Karte', 'Karten')} beantwortet.`,
  leadEmpty: 'Nach deinen Angaben gab es in dieser Runde keine passenden Karten.',
  overviewTitle: 'So hast du geantwortet',
  rules: (count) => `${plural(count, 'feste Regel', 'feste Regeln')} aus deinen Angaben`,
  profileHint: 'In deinem Profil siehst du alles im Detail.',
  toProfile: 'Mein Profil ansehen',
};

// Mein Profil
export const PROFILE = {
  title: 'Mein Profil',
  answered: (count) => `${plural(count, 'Karte', 'Karten')} beantwortet`,
  tasteTitle: 'Dein Geschmack',
  tasteLead: 'Direkt aus deinen Antworten, ohne Berechnung.',
  groups: {
    PREFER: 'Das magst du besonders',
    LIKE: 'Das magst du',
    DISLIKE: 'Das magst du eher nicht',
    UNFAMILIAR: 'Kennst du nicht',
  },
  dislikeNote: 'Kein Verbot: Ausnahmen fragen wir später gezielt nach.',
  tasteEmpty: 'Noch keine Antworten. Wische die ersten Karten, dann erscheinen sie hier.',
  exclusionsTitle: 'Ausschlüsse',
  exclusionsLead: 'Das schlagen wir dir nie vor. Diese Regeln stehen immer über dem Geschmack.',
  sections: {
    allergies: 'Allergien',
    diet: 'Ernährungsweise',
    intolerances: 'Vertrage ich nicht',
    never: 'Möchte ich nicht essen',
    notes: 'Notizen',
  },
  sources: {
    onboarding: 'im Onboarding',
    swipe: 'beim Wischen',
    profile: 'im Profil',
  },
  sourceLine: (texts) => `Angegeben ${texts.join(' und ')}`,
  noDiet: 'Keine feste Ernährungsweise',
  sectionEmpty: 'Nichts angegeben',
  unsure: 'Du bist dir nicht sicher, ob es weitere Unverträglichkeiten gibt.',
  emptyTitle: 'Noch kein Geschmacksprofil',
  emptyText: 'Beantworte zuerst die Fragen und wische dich durch die erste Runde. Danach steht hier, was du magst.',
  emptyAction: 'Profil erstellen',
  continueAction: 'Weiter mit dem Profil',
  restart: 'Von vorn beginnen',
  restartTitle: 'Wirklich von vorn beginnen?',
  restartText: 'Deine Antworten in dieser App werden zurückgesetzt. Für die Auswertung bleiben sie auf diesem Gerät gespeichert.',
  restartConfirm: 'Ja, von vorn beginnen',
  credits: 'Bildnachweise',
  creditLine: (photo) => `${photo.cardTitle}: Foto von ${photo.photographer}, ${photo.source} (${photo.license})`,
};

// Fehlerzustand für jeden Bildschirm (ErrorBoundary)
export const ERRORS = {
  title: 'Da ist etwas schiefgelaufen',
  text: 'Lade die Seite neu, um es nochmals zu versuchen.',
  reload: 'Neu laden',
};

// Ansicht für die Testleitung (?admin=1)
export const ADMIN = {
  kicker: 'Nur für die Testleitung',
  title: 'Sitzungen',
  lead: ({ sessions, events, limit, tutorial, imageStyle }) =>
    `${plural(sessions, 'Sitzung', 'Sitzungen')} mit ${plural(events, 'Ereignis', 'Ereignissen')} auf diesem Gerät. Nächste Testperson startet mit ${limit} Karten pro Runde, Tutorial ${tutorial ? 'an' : 'aus'}, ${imageStyle === 'illustration' ? 'Illustrationen' : 'Fotos'}.`,
  newParticipant: 'Neue Testperson starten',
  exportJson: 'Export JSON (alles)',
  exportCsv: 'Export CSV (Ereignisse)',
  empty: 'Noch keine Sitzungen auf diesem Gerät.',
  noCode: 'ohne Nr.',
  finished: (duration) => `fertig, ${duration}`,
  unfinished: 'nicht beendet',
  duration: (minutes, seconds) => `${minutes}:${String(seconds).padStart(2, '0')} min`,
  details: ({ answers, undos, limit, tutorial, sessionId }) =>
    `${answers} Antworten, ${undos} × Rückgängig · Limit ${limit}, Tutorial ${tutorial ? 'an' : 'aus'} · ${sessionId}`,
  deleteAll: 'Alle Daten löschen',
  deleteQuestion: (count) =>
    `Wirklich ${count === 1 ? 'die Sitzung' : `alle ${count} Sitzungen`} auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen. Vorher exportieren.`,
  deleteCancel: 'Abbrechen',
  deleteConfirm: 'Endgültig löschen',
};
