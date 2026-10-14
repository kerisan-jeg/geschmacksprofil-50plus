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
  steps: ['Kurz anmelden mit Vorname und Handynummer', 'Drei Fragen zu Allergien und Ernährung', 'Karten wischen oder tippen'],
  pause: 'Aufhören kannst du jederzeit.',
  start: 'Los geht’s',
  fineprint: 'Prototyp aus einem Studierendenprojekt der ZHAW für nurec. Deine Antworten bleiben auf diesem Gerät.',
  storageBlocked: 'Dein Browser erlaubt hier kein Speichern. Die App funktioniert, aber beim Schliessen gehen deine Antworten verloren.',
};

// Registrierung: Vorname → Handynummer → SMS-Code (simuliert, siehe src/auth/MockAuthService.js)
export const REGISTER = {
  stepOf: (position, total) => `Schritt ${position} von ${total}`,
  nameTitle: 'Wie heisst du?',
  nameLead: 'Nur dein Vorname, kein Nachname. So sprechen wir dich in der App an.',
  nameLabel: 'Vorname',
  nameError: 'Bitte gib deinen Vornamen ein.',
  nameNext: 'Weiter',
  phoneTitle: 'Deine Handynummer',
  phoneLead: 'Wir schicken dir einen Code per SMS. Damit findest du dein Profil auf diesem Gerät wieder.',
  countryLabel: 'Ländervorwahl',
  countries: { CH: 'Schweiz', DE: 'Deutschland', AT: 'Österreich', LI: 'Liechtenstein', FR: 'Frankreich', IT: 'Italien' },
  countryOption: (name, dial) => `${name} (${dial})`,
  phoneLabel: 'Handynummer',
  phonePlaceholder: '079 123 45 67',
  phoneErrors: {
    empty: 'Bitte gib deine Handynummer ein.',
    too_short: 'Die Nummer ist zu kurz. Prüfe, ob alle Ziffern stimmen.',
    too_long: 'Die Nummer ist zu lang. Prüfe, ob alle Ziffern stimmen.',
    not_mobile: 'Das ist keine Handynummer. In der Schweiz beginnt sie mit 07, z. B. 079 123 45 67.',
  },
  phonePrivacy: 'Deine Nummer bleibt auf diesem Gerät. Nach der Bestätigung behalten wir sie nur gekürzt.',
  sendCode: 'Code senden',
  sending: 'Code wird gesendet …',
  sendError: 'Der Code konnte nicht gesendet werden. Bitte versuche es nochmals.',
  codeTitle: 'Code eingeben',
  codeLead: (masked) => `Wir haben dir einen Code mit 6 Ziffern an ${masked} geschickt.`,
  codeLabel: 'Code aus der SMS',
  codeHint: 'Du kannst den Code auch einfügen.',
  checking: 'Code wird geprüft …',
  confirmCode: 'Bestätigen',
  codeWrong: 'Der Code stimmt nicht. Prüfe die SMS und gib ihn nochmals ein.',
  codeExpired: 'Der Code ist abgelaufen. Lass dir einen neuen schicken.',
  resend: 'Code erneut senden',
  resendIn: (seconds) => `Neuen Code in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
  resent: 'Wir haben dir einen neuen Code geschickt.',
  changeNumber: 'Nummer ändern',
  simulationNote: 'Prototyp: Es wird keine echte SMS verschickt. Der Code erscheint oben als Mitteilung.',
};

// Simulierte SMS-Mitteilung oben am Bildschirm
export const SMS = {
  region: 'Mitteilung',
  app: 'Nachrichten',
  time: 'jetzt',
  sender: 'Geschmack',
  text: (code) => `${code} ist dein Code für Geschmacksprofil. Gib ihn nicht weiter.`,
  dismiss: 'Mitteilung schliessen',
};

// Wiederkehrende Person auf demselben Gerät
export const WELCOME_BACK = {
  title: (name) => (name ? `Willkommen zurück, ${name}` : 'Willkommen zurück'),
  lead: 'Schön, dass du wieder da bist. Du machst dort weiter, wo du aufgehört hast.',
  phone: (masked) => `Angemeldet mit ${masked}`,
  continue: 'Weiter',
  notMe: (name) => (name ? `Ich bin nicht ${name}` : 'Jemand anderes möchte die App nutzen'),
};

// Über dich: erster Schritt im Onboarding (Alter und Einwilligung; Vorname nur ohne Registrierung)
export const ABOUT = {
  title: 'Über dich',
  lead: 'Zwei kurze Angaben, dann geht es mit den Fragen weiter.',
  leadNoAuth: 'Ein paar kurze Angaben, dann geht es mit den Fragen weiter.',
  firstName: 'Vorname',
  optional: 'freiwillig',
  firstNameHint: 'Damit wir dich persönlich ansprechen können.',
  age: 'Alter',
  ageGroups: [
    { id: '50-59', label: '50 bis 59' },
    { id: '60-69', label: '60 bis 69' },
    { id: '70-79', label: '70 bis 79' },
    { id: '80+', label: '80 und älter' },
  ],
  consent: 'Ich bin einverstanden, dass meine Antworten ohne Namen für dieses Studierendenprojekt ausgewertet werden.',
  errorAge: 'Bitte wähle deine Altersgruppe.',
  errorConsent: 'Bitte bestätige die Einwilligung, damit es weitergehen kann.',
  leadDetails: 'Für die Testleitung',
  participantCode: 'Teilnehmer-Nr.',
  participantPlaceholder: 'z. B. T07',
  submit: 'Weiter',
  privacy: 'Deine Angaben bleiben auf diesem Gerät.',
};

// Profil-Knopf oben rechts (Kreis mit Initiale)
export const AVATAR = {
  open: (name) => (name ? `Mein Profil (${name})` : 'Mein Profil'),
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
  // Nach „Ändern“ in der Zusammenfassung: nur diese Frage, danach zurück zur Übersicht
  editKicker: 'Angabe ändern',
  backToSummary: 'Zurück zur Übersicht',
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

// Einheitliche Suche (FoodSearch): Onboarding und Profil
export const SEARCH = {
  family: 'Lebensmittelgruppe',
  tag: 'alles mit diesem Merkmal',
  allergen: 'Allergen',
  matchedVia: (term) => `passt zu „${term}“`,
  matchedViaStart: 'passt zu „',
  matchedViaEnd: '“',
  results: (count) => (count === 1 ? '1 Vorschlag' : `${count} Vorschläge`),
  noResult: 'Kein Eintrag gefunden.',
  addNote: (text) => `„${text}“ als Notiz eintragen`,
  selected: 'ausgewählt',
};

// Detailauswahl (Onboarding und „Vertrage ich nicht“ beim Wischen)
export const PICKER = {
  confirm: 'Übernehmen',
  cancel: 'Abbrechen',
  close: 'Schliessen',
  selectSection: (label) => `Alle ${label}`,
  nothingSelected: 'Bitte wähle mindestens einen Eintrag.',
};

// Marken und Herkunft (Frage 3), wie sie in der Zusammenfassung und in „Mein Profil“ stehen
export const BRANDS = {
  brands: (list) => `Marken: ${list.join(', ')}`,
  origins: (list) => `Herkunft: ${list.join(', ')}`,
};

// Zusammenfassung vor der ersten Karte (nurec v0.2, Kap. 2.2): Die Person bestätigt oder korrigiert jede Regel.
export const SUMMARY = {
  kicker: 'Fragen beantwortet',
  thanks: (name) => `Danke, ${name}`,
  title: 'Stimmt das so?',
  lead: 'Diese Zutaten, Lebensmittel und Produkte schlagen wir dir nie vor, egal wie du später wischst.',
  leadNone: 'Du hast nichts angegeben, das wir weglassen müssen.',
  sections: { diet: 'Ernährungsweise', intolerances: 'Allergien und Unverträglichkeiten', never: 'Möchte ich nicht essen' },
  none: { diet: 'Keine feste Ernährungsweise', intolerances: 'Keine bekannt', never: 'Nichts angegeben' },
  edit: 'Ändern',
  editFor: (section) => `${section} ändern`,
  // Unsicherheits-Flag aus Frage 2: Die Frage bleibt offen, daraus folgt keine Freigabe (Kap. 2.2).
  open: 'Offen: Du bist dir nicht sicher, ob es weitere gibt. Merkst du beim Wischen etwas, tippe auf „Vertrage ich nicht“.',
  noCards: 'Nach deinen Angaben bleibt keine Karte übrig. Prüfe deine Angaben oder schliesse direkt ab.',
  confirm: 'Stimmt so',
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
  greeting: (name) => (name ? `Hallo ${name}` : 'Hallo'),
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
  signOut: 'Abmelden',
  signOutTitle: 'Abmelden?',
  signOutText: 'Dein Profil wird von diesem Gerät gelöscht. Für die Auswertung bleiben deine Antworten ohne Namen und ohne Nummer gespeichert.',
  signOutConfirm: 'Ja, abmelden',
  // Bearbeiten
  editRating: 'Bewertung ändern',
  editRatingFor: (title) => `${title}: Bewertung ändern`,
  ratingLabel: 'Wie gern isst du das?',
  ratingRemove: 'Aus dem Profil entfernen',
  ratingNote: 'Deine ursprüngliche Antwort beim Wischen bleibt im Protokoll erhalten.',
  removed: (title) => `${title} ist nicht mehr in deinem Profil.`,
  changed: 'Gespeichert.',
  undoChange: 'Rückgängig',
  editAllergies: 'Allergien ändern',
  allergiesHint: 'Tippe an, was zutrifft. Bei Nüssen und Gluten kannst du einzelne Einträge wählen.',
  change: 'Ändern',
  changeDietFor: (label) => `Ernährungsweise ändern: ${label}`,
  add: 'Hinzufügen',
  remove: (label) => `${label} entfernen`,
  searchIntolerances: 'Was verträgst du nicht?',
  searchNever: 'Was möchtest du nicht essen?',
  searchLabel: 'Lebensmittel suchen',
  searchPlaceholder: 'z. B. Rahm oder Rüebli',
  done: 'Fertig',
  confirmRemoveTitle: (label) => `${label} entfernen?`,
  confirmRemoveAllergy: 'Dann schlagen wir dir Lebensmittel damit wieder vor, auch in allen weiteren Runden.',
  confirmRemoveIntolerance: 'Dann schlagen wir es dir wieder vor, auch in allen weiteren Runden.',
  confirmRemove: 'Ja, entfernen',
  allergiesRemovedTitle: (count) => (count === 1 ? 'Eine Allergie entfernen?' : `${count} Allergien entfernen?`),
  allergiesRemovedText: (names) => `${names.join(', ')}: Diese Lebensmittel schlagen wir dir dann wieder vor.`,
  credits: 'Bildnachweise',
  creditLine: (photo) => `${photo.cardTitle}: Foto von ${photo.photographer}, ${photo.source} (${photo.license})`,
};

// Fehlerzustand für jeden Bildschirm (ErrorBoundary)
export const ERRORS = {
  title: 'Da ist etwas schiefgelaufen',
  text: 'Lade die Seite neu. Deine Angaben auf diesem Gerät bleiben erhalten.',
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
