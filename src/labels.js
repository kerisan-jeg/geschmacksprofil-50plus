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

// Bewertungsbegriffe je Variante (Dozentenfeedback 19.10.2026, Verbesserung 3). Die internen Werte bleiben
// DISLIKE, LIKE, PREFER; welcher Begriff gezeigt wurde, steht als labelShown im Ereignis.
//   r1-3      Runde 1 (Gruppen), Standard
//   r1-2      Runde 1 mit ?r1scale=2: ohne „Sehr gern“
//   standard  Runden 2 bis 4 (A3)
export const SCALE_LABELS = {
  'r1-3': { DISLIKE: 'Eher ungern', LIKE: 'Eher gern', PREFER: 'Sehr gern' },
  'r1-2': { DISLIKE: 'Eher ungern', LIKE: 'Eher gern' },
  standard: { DISLIKE: ANSWER_LABELS.DISLIKE, LIKE: ANSWER_LABELS.LIKE, PREFER: ANSWER_LABELS.PREFER },
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
  round: (number = 1) => `Runde ${number}`,
  dishes: 'Gerichte',
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
  sendErrors: {
    invalidNumber: 'An diese Nummer können wir keine SMS schicken. Prüfe sie bitte.',
    tooMany: 'Zu viele Versuche. Bitte warte ein paar Minuten und versuche es dann nochmals.',
    network: 'Keine Verbindung zum Internet. Prüfe die Verbindung und versuche es nochmals.',
    retry: 'Die Sicherheitsprüfung hat nicht geklappt. Bitte versuche es nochmals.',
    unavailable: 'Der SMS-Versand ist im Moment nicht möglich. Bitte versuche es später nochmals.',
  },
  // Echte SMS über Firebase (Google): ehrlich sagen, wohin die Nummer geht
  phonePrivacyReal: 'Für die SMS geht deine Nummer an Google Firebase. Nach der Bestätigung löschen wir sie dort wieder; auf diesem Gerät bleibt sie nur gekürzt.',
  recaptcha: {
    text: 'Geschützt durch reCAPTCHA. Es gelten die Datenschutzerklärung und die Nutzungsbedingungen von Google.',
    privacy: 'Datenschutzerklärung',
    terms: 'Nutzungsbedingungen',
    privacyUrl: 'https://policies.google.com/privacy',
    termsUrl: 'https://policies.google.com/terms',
  },
  realSmsNote: 'Die SMS kommt meist innert einer Minute. Auf vielen Handys erscheint der Code direkt über der Tastatur.',
  codeTooMany: 'Zu viele Versuche. Bitte warte ein paar Minuten.',
  codeFailed: 'Die Prüfung hat nicht geklappt. Prüfe die Internetverbindung und versuche es nochmals.',
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

// Frage 1: Ernährungsform, Einzelausschlüsse, Speisevorschriften (Dozentenfeedback 19.10.2026).
// Die Fragen selbst stehen in src/data/stage0.json. Keine Frage nach Religion, keine Aussage wie „geeignet“.
export const DIET = {
  coveredBy: (form) => `Schon durch „${form}“ abgedeckt`,
  rulesNote: 'Halal und koscher betreffen auch Zubereitung und Herkunft. Das können wir nicht prüfen. Wir lassen nur weg, was du hier bestätigst.',
  suggestTitle: (rules) => `Oft weggelassen bei ${rules.join(' und ')}. Was gilt für dich?`,
  suggestNone: 'Bestätigst du nichts, schliessen wir deswegen nichts aus.',
  rulesLine: (rules) => `Speisevorschrift: ${rules.join(', ')}`,
  rulesEffect: 'Weggelassen wird nur, was du bestätigt hast.',
  addTitle: 'Lässt du etwas immer weg?',
};

// Onboarding (Stufe 0): Allergien und „Nie vorschlagen“
export const ONBOARDING = {
  searchAllergensLabel: 'Weitere Allergien oder Lebensmittel suchen',
  searchAllergensPlaceholder: 'z. B. Fisch oder Sellerie',
  selectedTitle: 'Deine Auswahl',
  removeChip: (text) => `${text} entfernen`,
  tileChooseDetail: 'Auswählen',
  tileCount: (count, total) => (count === total ? 'Alle' : `${count} von ${total}`),
  unsureMore: 'Ich bin mir nicht sicher, ob es weitere gibt',
  // nurec v0.2, Kap. 2.1: Quelle der Vorgabe (0.2) und Geltungsbereich bei Unverträglichkeiten (0.3)
  medical: 'Ärztlich oder fachlich festgestellt (z. B. Zöliakie)',
  medicalHint: 'Freiwillig. Hilft später bei Vorschlägen, ändert aber nichts: Wir lassen alles weg, was du angibst.',
  scopeTitle: (name) => `${name}: Musst du ganz darauf verzichten?`,
  scopes: { avoid: 'Ganz meiden', limited: 'Kleine Mengen gehen' },
  scopeNote: 'Wir schlagen es dir trotzdem nicht vor, solange keine genaue Menge feststeht.',
  // A4: Satz bei gesetztem Unsicherheits-Flag. Das Flag selbst schliesst nichts aus.
  unsureHint: 'Merkst du beim Wischen, dass du etwas nicht verträgst, tippe auf «Vertrage ich nicht».',
  noResult: 'Kein Eintrag gefunden.',
  alreadyCovered: 'Das ist durch deine bisherigen Angaben schon ausgeschlossen.',
  addEntry: (text) => `„${text}“ eintragen`,
  add: 'Hinzufügen',
  // Wirkung eines eingetippten Eintrags ohne eigene Karte (z. B. „Tomate“), ehrlich formuliert
  entryEffect: 'Eingetippte Einträge zeigen wir nirgends mehr als Beispiel. Eine ganze Gruppe fällt dadurch nicht weg.',
  allergyNoteEffect: 'Nicht eindeutig zugeordnet – bitte prüfen. Die Notiz ersetzt keinen verlässlich geprüften Ausschluss. Wir können nur passende Namen und bekannte Zutaten berücksichtigen.',
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
  // Marken und Händler (Bereich 0.6): genau zuordnen, sonst Status „prüfen“
  brandsSearchLabel: 'Marke oder Händler suchen',
  brandsSearchPlaceholder: 'z. B. M-Budget oder Denner',
  brandAddNote: (text) => `„${text}“ trotzdem eintragen`,
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
  noResult: 'Nicht in der Liste.',
  didYouMean: 'Meintest du:',
  addNote: (text) => `„${text}“ trotzdem als Notiz eintragen`,
  selected: 'ausgewählt',
  dish: 'Gericht',
  retailer: 'Händler',
  brand: 'Marke',
  brandOf: (owner) => `Marke von ${owner}`,
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
  none: { diet: 'Keine besondere Ernährungsform', intolerances: 'Keine bekannt', never: 'Nichts angegeben' },
  edit: 'Ändern',
  editFor: (section) => `${section} ändern`,
  // Unsicherheits-Flag aus Frage 2: Die Frage bleibt offen, daraus folgt keine Freigabe (Kap. 2.2).
  open: 'Offen: Du bist dir nicht sicher, ob es weitere gibt. Merkst du beim Wischen etwas, tippe auf „Vertrage ich nicht“.',
  noCards: 'Nach deinen Angaben bleibt keine Karte übrig. Prüfe deine Angaben oder schliesse direkt ab.',
  confirm: 'Stimmt so',
  // Einleitung zu Runde 1 (Dozentenfeedback 19.10.2026), Text in ROUND.round1Intro
  nextTitle: 'Danach: Runde 1',
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

// Rundenübersicht (Dozentenfeedback 19.10.2026, Verbesserung 7): Abschluss und während des Wischens
export const ROUNDS = {
  title: 'Deine Runden',
  status: { open: 'Noch offen', started: 'Begonnen', completed: 'Abgeschlossen' },
  progress: (answered, total) => `${answered} von ${total} Karten`,
  done: (answered) => (answered === 1 ? '1 Karte' : `${answered} Karten`),
  empty: 'Keine passenden Karten nach deinen Angaben',
  locked: (round) => `Startet nach Runde ${round}`,
  resume: (round) => `Runde ${round} fortsetzen`,
  resumeNote: 'Bereits beantwortete Karten kommen nicht noch einmal.',
  openOverview: 'Übersicht der Runden öffnen',
  sheetIntro: 'Deine Antworten bleiben gespeichert. Die Zeit für die Karte läuft nicht weiter.',
  backToCard: 'Zurück zur Karte',
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
  dishKind: 'Gericht',
  examplesLabel: 'Zum Beispiel',
  cardDescription: ({ title, notes, examples, description, stage }) =>
    [title, description, notes?.join(', '), stage !== 1 && examples.length > 0 && `Zum Beispiel ${examples.join(', ')}`].filter(Boolean).join('. '),
  // Rundenanzeige über dem Kartenstapel (Verbesserung 5). Namen nach dem Stufenablauf.
  roundNames: { 1: 'Lebensmittelgruppen', 2: 'Genauer nachgefragt', 3: 'Einzelne Lebensmittel', 4: 'Gerichte' },
  roundOf: (round, total, name, hint) => [`Runde ${round} von ${total}`, name, hint].filter(Boolean).join(' · '),
  // Kurzer Zusatz in der Rundenanzeige (Verbesserung 3). Der ausführliche Satz steht auf der Zusammenfassung.
  roundHints: { 1: 'erste grobe Einschätzung' },
  // Einleitung zu Runde 1 auf der Zusammenfassung davor (nicht auf der Karte: kein Scrollen in der Runde)
  round1Intro: 'Hier geht es um eine erste grobe Einschätzung. Einzelne Lebensmittel fragen wir später genauer.',
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
  joinTitles: (titles) => titles.length <= 1 ? titles[0] ?? '' : `${titles.slice(0, -1).join(', ')} und ${titles.at(-1)}`,
};

// Abschluss nach der Runde
export const COMPLETE = {
  kickerDone: (round) => `Runde ${round} abgeschlossen`,
  kickerEnded: (round) => `Runde ${round} beendet`,
  title: (name) => (name ? `Danke, ${name}!` : 'Danke!'),
  leadDone: (count) => `Du hast alle ${plural(count, 'Karte', 'Karten')} dieser Runde beantwortet.`,
  leadEnded: (count) => `Du hast ${plural(count, 'Karte', 'Karten')} beantwortet.`,
  leadEmpty: 'Nach deinen Angaben gab es in dieser Runde keine passenden Karten.',
  leadComplete: 'Deine Profilerstellung ist abgeschlossen.',
  nextHint: (titles) => `Als Nächstes zum Beispiel: ${titles.join(', ')}.`,
  nextRound: (round) => `Weiter mit Runde ${round}`,
  overviewTitle: 'So hast du bisher geantwortet',
  rules: (count) => `${plural(count, 'feste Regel', 'feste Regeln')} aus deinen Angaben`,
  profileHint: 'In deinem Profil siehst du alles im Detail.',
  toProfile: 'Mein Profil ansehen',
  // Gerichte (Stufe 4, freiwillig)
  kickerDishes: 'Gerichte bewertet',
  leadDishes: (count) => `Du hast ${plural(count, 'Gericht', 'Gerichte')} bewertet.`,
  leadDishesEnded: (count) => `Du hast ${plural(count, 'Gericht', 'Gerichte')} bewertet. Deine bisherigen Antworten sind gespeichert.`,
  optionalTitle: 'Freiwillig',
  startDishes: 'Gerichte bewerten',
  moreDishes: 'Weitere Gerichte bewerten',
  dishesHint: 'Zum Beispiel Pizza Margherita oder Rösti. Gerichte stehen getrennt von den Lebensmitteln.',
  startPractical: 'Alltag ergänzen',
  practicalHint: 'Kochzeit, Küche, Budget und Einkauf: damit Vorschläge später zu deinem Alltag passen.',
};

// Profilstand „Profil aufgebaut“ (nurec v0.2, Anhang B2): ein Erfassungsgrad, keine Trefferquote
export const PROGRESS = {
  title: 'Profil aufgebaut',
  value: (percent) => `${percent} %`,
  valueText: (percent) => `${percent} Prozent deines Profils aufgebaut`,
  note: 'Zeigt, wie viel von deinem Geschmack erfasst ist, nicht wie genau Vorschläge sind.',
  stages: ['Erste Antworten', 'Stufe 1 abgeschlossen: Gruppen', 'Stufe 2 abgeschlossen: Unterschiede und Ausnahmen'],
  nextTitle: 'Nächster sinnvoller Schritt',
  next: {
    continue: 'Weiter mit der Profilerstellung',
    round: (number, titles) => (titles.length > 0 ? `Runde ${number}, zum Beispiel ${titles.join(', ')}` : `Runde ${number}`),
    dishes: 'Gerichte bewerten (freiwillig)',
    practical: 'Alltag ergänzen (freiwillig)',
    done: 'Die Profilerstellung ist abgeschlossen. Antworten kannst du hier jederzeit ändern.',
  },
  action: {
    continue: 'Weitermachen',
    round: (number) => `Weiter mit Runde ${number}`,
    dishes: 'Gerichte bewerten',
    practical: 'Alltag ergänzen',
  },
};

// Alltagsprofil (nurec v0.2, Kap. 2.3), freiwillig. Fragen und Antworten stehen in src/data/practical.json.
export const PRACTICAL = {
  kicker: 'Freiwillig: dein Alltag',
  counter: (position, total) => ({ strong: `Frage ${position}`, rest: ` von ${total}` }),
  progressLabel: 'Fortschritt Alltagsprofil',
  lead: 'Damit spätere Vorschläge zu deinem Alltag passen. Jede Frage kannst du überspringen.',
  next: 'Weiter',
  skip: 'Überspringen',
  done: 'Fertig',
  brandsPreferred: 'Marken, die du gern kaufst',
  brandsAvoided: 'Marken, die du ungern kaufst',
  brandsHint: 'Nicht verbindlich. Was du nie kaufen willst, gehört zu „Möchte ich nicht essen“.',
  brandsPlaceholder: 'z. B. M-Budget oder Coop Naturaplan',
  noEffect: 'Wirkt erst, wenn es Produktvorschläge gibt. Auf die Karten hier hat es keine Wirkung.',
}; 

// Mein Profil
export const PROFILE = {
  title: 'Mein Profil',
  greeting: (name) => (name ? `Hallo ${name}` : 'Hallo'),
  answered: (count) => `${plural(count, 'Karte', 'Karten')} beantwortet`,
  tasteTitle: 'Dein Geschmack',
  tasteLead: 'Deine aktuellen Antworten. Tippe auf eine Kategorie für alle Details.',
  overviewTotal: 'Karten mit Antwort',
  overviewTypes: (groups, foods, dishes) => `${plural(groups, 'Gruppe', 'Gruppen')} · ${plural(foods, 'Lebensmittel', 'Lebensmittel')} · ${plural(dishes, 'Gericht', 'Gerichte')}`,
  overviewNote: 'Anteil deiner aktuellen Antworten, ohne Vermutungen und Ausschlüsse. Mit weiteren Karten wächst die Momentaufnahme.',
  answerEmpty: 'Noch keine Antwort in dieser Kategorie.',
  answerKinds: { group: 'Lebensmittelgruppe', food: 'Lebensmittel', dish: 'Gericht' },
  answerMeaning: '„Mag ich sehr“ bedeutet besonders gern. „Kenne ich nicht“ ist keine Geschmacksbewertung. Gruppen bewerten keine einzelnen Lebensmittel; Gerichte bewerten keine Zutaten.',
  insightsTitle: 'Weitere Einblicke',
  insightsLead: 'Vermutungen, offene Gruppen und Unterschiede bei der Zubereitung.',
  restrictionsSummary: (diet, count, notes) => `${diet} · ${plural(count, 'Ausschluss', 'Ausschlüsse')}${notes ? ` · ${plural(notes, 'Notiz zu prüfen', 'Notizen zu prüfen')}` : ''}`,
  // Dashboard nach nurec v0.2, Anhang B1 und B3
  favoritesTitle: 'Deine Favoriten',
  favoritesLead: 'Konkrete Lebensmittel, die du selbst bewertet hast.',
  favoritesEmpty: 'Noch keine bestätigten Favoriten. Favoriten entstehen, wenn du konkrete Lebensmittel wie „Naturtofu“ bewertest.',
  favoriteGroups: { PREFER: 'Sehr gern', LIKE: 'Gern' },
  groupsTitle: 'Gruppen, die du magst',
  groupsLead: 'Gilt für die Gruppe, nicht automatisch für jedes Lebensmittel darin.',
  dislikesTitle: 'Isst du eher ungern',
  exception: (names) => `Ausnahme: ${names}`,
  openTitle: 'Noch offen',
  openLead: '„Kenne ich nicht“ und noch nie gefragt sind keine Bewertung.',
  unfamiliarTitle: 'Kennst du nicht',
  unaskedTitle: 'Noch nicht gefragt',
  detailsTitle: 'Feinheiten',
  detailsLead: 'Roh und gegart hast du verschieden bewertet.',
  detailLine: (raw, rawRating, cooked, cookedRating) => `${raw}: ${rawRating} · ${cooked}: ${cookedRating}`,
  dishesTitle: 'Gerichte',
  dishesLead: 'Getrennt von den Lebensmitteln: Ein Gericht sagt nichts über seine Zutaten.',
  dishesEmpty: 'Noch keine Gerichte bewertet. Das ist freiwillig.',
  // Esskulturen: nur Tendenz, erst ab CUISINE_MIN_RATED bewerteten Gerichten einer Küche
  cuisinesTitle: 'Tendenz nach Küche',
  cuisineLine: (label, direction, rated) =>
    `${label}: ${{ LIKE: 'eher gern', DISLIKE: 'eher ungern', MIXED: 'gemischt' }[direction]} (${rated} Gerichte bewertet)`,
  cuisinesNote: (min) => `Eine Tendenz zeigen wir erst ab ${min} bewerteten Gerichten einer Küche. „Kenne ich nicht“ zählt nicht.`,
  dishesAction: (some) => (some ? 'Weitere Gerichte bewerten' : 'Gerichte bewerten'),
  practicalTitle: 'Alltag',
  practicalLead: 'Freiwillig. Hilft später bei Vorschlägen, die zu deinem Alltag passen. Wirkt noch nicht auf die Karten.',
  practicalEmpty: 'Noch nichts angegeben.',
  practicalAdd: 'Ergänzen',
  practicalEdit: 'Ändern',
  statusCheck: 'prüfen',
  statusCheckHint: 'Nicht eindeutig zugeordnet. Kein verlässlich geprüfter Ausschluss.',
  medical: 'ärztlich vorgegeben',
  scopeLimited: 'kleine Mengen gehen',
  groups: {
    PREFER: 'Das magst du besonders',
    LIKE: 'Das magst du',
    DISLIKE: 'Das magst du eher nicht',
    UNFAMILIAR: 'Kennst du nicht',
  },
  dislikeNote: 'Kein Verbot: Ausnahmen fragen wir später gezielt nach.',
  tasteEmpty: 'Noch keine Antworten. Wische die ersten Karten, dann erscheinen sie hier.',
  // Vermutungen der App (src/logic/preferences.js), getrennt von den eigenen Bewertungen
  derived: {
    title: 'Das vermutet die App',
    lead: 'Aus deinen Antworten abgeleitet, nicht von dir bewertet. Stimmt etwas nicht? Tippe darauf.',
    groups: { LIKE: 'Magst du vermutlich', DISLIKE: 'Magst du vermutlich nicht' },
    reason: (title, rating) => {
      if (rating === 'PREFER') return `Vermutet, weil du „${title}“ besonders magst`;
      if (rating === 'LIKE') return `Vermutet, weil du „${title}“ magst`;
      if (rating === 'DISLIKE') return `Vermutet, weil du „${title}“ eher nicht magst`;
      return `Vermutet aus deinen Antworten zu „${title}“`;
    },
    rowLabel: (title, reason) => `${title}. ${reason}. Vermutung prüfen`,
    sheetIntro: (rating) =>
      rating === 'DISLIKE'
        ? 'Die App vermutet, dass du das eher nicht magst. Wie gern isst du es wirklich?'
        : 'Die App vermutet, dass du das magst. Wie gern isst du es wirklich?',
    sheetNote: 'Deine Antwort ersetzt die Vermutung. Was die App vorher vermutet hat, bleibt im Protokoll.',
    showAll: (count) => `Alle anzeigen (${count})`,
    showLess: 'Weniger anzeigen',
  },
  exclusionsTitle: 'Ausschlüsse',
  exclusionsLead: 'Hinterlegte Ausschlüsse stehen über dem Geschmack. Notizen sind noch zu prüfen und bieten keinen vollständig geprüften Ausschluss.',
  sections: {
    allergies: 'Allergien und Unverträglichkeiten',
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
  noDiet: 'Keine besondere Ernährungsform',
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
  changeDietFor: (label) => `Ernährungsform ändern: ${label}`,
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
  credits: 'Bildnachweise und Quellen',
  foodSource: (version) => `Lebensmittelliste: ${version}, Bundesamt für Lebensmittelsicherheit und Veterinärwesen (BLV), naehrwertdaten.ch`,
  creditLine: (photo) => `${photo.cardTitle}: Foto von ${photo.photographer}, ${photo.source} (${photo.license})`,
  aiImages: (count) => `${count === 1 ? '1 Bild' : `${count} Bilder`} mit KI erzeugt (Google Gemini)`,
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
  lead: ({ sessions, events, limit, tutorial, imageStyle, selection, holdout, r1scale }) =>
    `${plural(sessions, 'Sitzung', 'Sitzungen')} mit ${plural(events, 'Ereignis', 'Ereignissen')} auf diesem Gerät. Nächste Testperson startet mit ${limit} Karten pro Runde, Tutorial ${tutorial ? 'an' : 'aus'}, ${imageStyle === 'illustration' ? 'Illustrationen' : 'Fotos'}, ${selection === 'fixed' ? 'fester Reihenfolge' : 'adaptiver Auswahl'}, ${plural(holdout, 'Kontrollkarte', 'Kontrollkarten')} und Skala Runde 1: ${r1scale}.`,
  newParticipant: 'Neue Testperson starten',
  exportJson: 'Export JSON (alles)',
  exportCsv: 'Export CSV (Ereignisse)',
  empty: 'Noch keine Sitzungen auf diesem Gerät.',
  noCode: 'ohne Nr.',
  finished: (duration) => `fertig, ${duration}`,
  unfinished: 'nicht beendet',
  duration: (minutes, seconds) => `${minutes}:${String(seconds).padStart(2, '0')} min`,
  details: ({ answers, undos, sessionId }) => `${answers} Antworten, ${undos} × Rückgängig · ${sessionId}`,
  // Effektive Konfiguration der Sitzung (so wie sie lief). r1scale folgt mit Arbeitspaket 2.
  config: ({ limit, tutorial, selection, holdout, imageStyle, r1scale }) =>
    [
      `Limit ${limit ?? '–'}`,
      `Tutorial ${tutorial ? 'an' : 'aus'}`,
      selection === 'fixed' ? 'feste Reihenfolge' : 'adaptiv',
      plural(holdout ?? 0, 'Kontrollkarte', 'Kontrollkarten'),
      imageStyle === 'illustration' ? 'Illustrationen' : 'Fotos',
      ...(r1scale ? [`Skala Runde 1: ${r1scale}`] : []),
    ].join(' · '),
  // Stiller Rückfall: Ein URL-Parameter war ungültig, es galt der Standard
  ignored: (params) => `Achtung, ignoriert: ${params.map(({ name, value }) => `?${name}=${value}`).join(', ')}. Es galt der Standard.`,
  ignoredNext: (params) => `Achtung, in dieser Adresse ignoriert: ${params.map(({ name, value }) => `?${name}=${value}`).join(', ')}. Es gilt der Standard.`,
  // Kontrollkarten (Messkonzept): nur vollständige Sitzungen eignen sich für die Auswertung
  checks: ({ answered, drawn }) => (drawn === 0 ? 'Ohne Kontrollkarten' : `Kontrollkarten: ${answered} von ${drawn} beantwortet`),
  deleteAll: 'Alle Daten löschen',
  deleteQuestion: (count) =>
    `Wirklich ${count === 1 ? 'die Sitzung' : `alle ${count} Sitzungen`} auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen. Vorher exportieren.`,
  deleteCancel: 'Abbrechen',
  deleteConfirm: 'Endgültig löschen',
};
