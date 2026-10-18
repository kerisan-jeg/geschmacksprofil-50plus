// Zustand und Ablauf der App als reine Funktionen (ohne React), damit der Ablauf testbar ist.
//
// Bereich „Profil erstellen“:
//   mit Registrierung (AUTH_ENABLED):  start → register-name → register-phone → register-code → about → …
//   ohne Registrierung:                about (Vorname freiwillig) → …
//   danach:                            questions → summary → round → complete → round (Runde 2) → complete …
//   Runden 1 bis 4:                    Familien → Untergruppen → konkrete Lebensmittel → Gerichte
//   freiwillig danach:                Alltagsprofil (practical, nurec v0.2 Kap. 2.3)
// Nach Frage 3 folgt die Zusammenfassung (nurec v0.2, Kap. 2.2): Die Person bestätigt die festen Regeln
// („Stimmt so“) oder korrigiert sie („Ändern“ führt zur passenden Frage und wieder zurück). Danach kommt
// direkt die erste Karte; das Tutorial (intro) nur, wenn TUTORIAL_ENABLED eingeschaltet ist.
// Nach jeder Runde: weiter, solange es noch Karten gibt, insgesamt höchstens MAX_ROUNDS Runden.
// Wiederkehrende Person auf demselben Gerät: welcome-back, dann weiter, wo sie war.
// Bereich „Mein Profil“: eigener Tab, der Ablauf oben bleibt dabei an seiner Stelle stehen.
//
// Das Event-Log (events) bleibt die einzige Quelle der Wahrheit (A8): Antworten beim Wischen,
// Profiländerungen und die Ereignisse der Registrierung stehen darin. Der Zustand der Runde und des
// Profils wird immer daraus abgeleitet (deriveRoundState → replay).

import { MAX_ROUNDS, normalizeConfig } from '../config.js';
import { UNDO } from '../logic/answers.js';
import { deriveRoundState, isRoundComplete, nextRoundNumber, progress } from '../logic/engine.js';
import { ANSWER, eventType } from '../logic/events.js';
import { deriveOnboarding, emptyAnswers } from '../logic/stage0.js';

export const SCREENS = {
  START: 'start',
  REGISTER_NAME: 'register-name',
  REGISTER_PHONE: 'register-phone',
  REGISTER_CODE: 'register-code',
  WELCOME_BACK: 'welcome-back',
  ABOUT: 'about',
  QUESTIONS: 'questions',
  SUMMARY: 'summary',
  INTRO: 'intro',
  ROUND: 'round',
  COMPLETE: 'complete',
  PRACTICAL: 'practical',
};

// DISHES bleibt nur für die Migration früherer separater Gerichte-Runden erhalten.
export const ROUND_MODES = { MAIN: 'main', DISHES: 'dishes' };

export const TABS = { CREATE: 'create', PROFILE: 'profile' };

// Angaben für die Auswertung (ohne Namen). Vorname und Telefonnummer stehen nur im Konto (account).
export const EMPTY_PERSON = { ageGroup: null, participantCode: '', consent: false };
export const EMPTY_REGISTRATION = { firstName: '', country: 'CH', phoneInput: '', e164: null, requestId: null, sentAt: null, resendAvailableAt: null };

const BEFORE_ONBOARDING = [SCREENS.START, SCREENS.REGISTER_NAME, SCREENS.REGISTER_PHONE, SCREENS.REGISTER_CODE, SCREENS.WELCOME_BACK, SCREENS.ABOUT];

// Erster Bildschirm: mit Registrierung die Begrüssung, sonst direkt das Onboarding („Über dich“).
export function firstScreen(config) {
  return config.auth ? SCREENS.START : SCREENS.ABOUT;
}

// Die untere Navigation erscheint erst nach der ersten Runde (Abschluss) und in „Mein Profil“.
// Während Registrierung, Fragen, Zusammenfassung und beim Wischen fehlt sie: Dort gibt es nur einen
// Weg nach vorn, und in der Runde haben Karte und Knöpfe den ganzen Bildschirm. „Mein Profil“ ist
// vorher über den runden Knopf oben rechts erreichbar; dort führt die Leiste zurück.
export function isNavVisible(state) {
  if (BEFORE_ONBOARDING.includes(state.screen)) return false;
  return state.tab === TABS.PROFILE || state.screen === SCREENS.COMPLETE;
}

// Nach „Stimmt so“: Tutorial nur, wenn es eingeschaltet ist (TUTORIAL_ENABLED), sonst direkt die erste Karte.
export function screenAfterSummary(config) {
  return config.tutorial ? SCREENS.INTRO : SCREENS.ROUND;
}

// Lohnt es sich, den Stand zu speichern? Erst wenn jemand registriert ist oder „Über dich“ bestätigt hat.
export function hasProgress(state) {
  return Boolean(state.account) || state.person.consent;
}

// Abschnitte der Profilerstellung für die Fortschrittsanzeige: Fragen → Runde 1 → Profil.
// state je Abschnitt: 'done' | 'current' | 'open'; die Runde trägt zusätzlich ihren Kartenfortschritt.
// Die Zusammenfassung schliesst die Fragen ab und gehört deshalb noch zu ihnen.
export function creationSteps(state, round) {
  const editingQuestions = state.screen === SCREENS.QUESTIONS || state.screen === SCREENS.SUMMARY || !state.onboarding;
  const roundDone = Boolean(state.onboarding) && state.screen === SCREENS.COMPLETE;
  const { answered, total } = round ? progress(round, state.config) : { answered: 0, total: 0 };
  let roundState = 'open';
  if (roundDone) roundState = 'done';
  else if (!editingQuestions) roundState = 'current';
  return [
    { id: 'questions', state: editingQuestions ? 'current' : 'done' },
    { id: 'round', state: roundState, answered, total, number: state.roundNumber ?? 1, kind: state.roundMode === ROUND_MODES.DISHES ? 'dishes' : 'round' },
    { id: 'profile', state: roundDone ? 'done' : 'open' },
  ];
}

export function createAppModel({ index, stage0, allergens }) {
  // Zustand der laufenden Ebene, Runde 1 bis MAX_ROUNDS; Runde 4 enthält Gerichte.
  function roundOf(state, events = state.events) {
    const round = state.roundNumber ?? 1;
    return deriveRoundState({ index, onboarding: state.onboarding, diets: stage0.diets, events, round });
  }

  // Zustand der Profilerstellung, auch während einer Gerichte-Runde (Dashboard, „Weiter mit Runde N“).
  function mainRoundOf(state) {
    return roundOf({ ...state, roundMode: ROUND_MODES.MAIN });
  }

  // saved: gespeicherter Stand (storage/local.js), account: Konto auf diesem Gerät.
  // Gibt es einen Stand, beginnt die App mit „Willkommen zurück“ und macht danach dort weiter.
  function initialState(config, { account = null, saved = null } = {}) {
    config = normalizeConfig(config);
    const base = {
      screen: firstScreen(config),
      tab: TABS.CREATE,
      config,
      account,
      person: EMPTY_PERSON,
      registration: EMPTY_REGISTRATION,
      answers: emptyAnswers(stage0.questions),
      step: 0,
      // true, solange eine Frage über „Ändern“ in der Zusammenfassung offen ist
      editing: false,
      onboarding: null,
      events: [],
      // Laufende Runde (1 bis MAX_ROUNDS); jede Antwort trägt sie im Event-Log (event.round).
      roundNumber: 1,
      // Legacy-Felder für bereits gespeicherte Sitzungen; neue Runden gehören zum selben Ablauf.
      roundMode: ROUND_MODES.MAIN,
      dishRound: 0,
      // Alltagsprofil: von wo es geöffnet wurde (dorthin geht es danach zurück)
      practicalFrom: null,
      endedEarly: false,
      resume: null,
    };
    if (!saved?.state) return base;
    const restored = { ...base, ...saved.state, config: normalizeConfig(saved.state.config ?? config), account, registration: EMPTY_REGISTRATION };
    if (restored.roundMode === ROUND_MODES.DISHES) restored.roundNumber = 4;
    restored.roundMode = ROUND_MODES.MAIN;
    // Alte Sitzungen jenseits der neuen Obergrenze abschliessen; bisherige Antworten bleiben erhalten.
    const beyondLimit = restored.roundNumber > MAX_ROUNDS;
    if (beyondLimit) {
      restored.roundNumber = MAX_ROUNDS;
      restored.screen = SCREENS.COMPLETE;
      restored.endedEarly = false;
    }
    // Eine gespeicherte vierte Runde mit Lebensmitteln darf jetzt mit Gerichten weitergehen.
    // Schon bewertete Karten und Ausschlüsse bleiben im selben Event-Log erhalten.
    if (restored.onboarding && restored.screen === SCREENS.ROUND && isRoundComplete(roundOf(restored), restored.config)) restored.screen = SCREENS.COMPLETE;
    if (!beyondLimit && restored.onboarding && restored.roundNumber === 4 && restored.screen === SCREENS.COMPLETE && !saved.state.config?.roundFlow && !isRoundComplete(roundOf(restored), restored.config)) restored.screen = SCREENS.ROUND;
    return { ...restored, screen: SCREENS.WELCOME_BACK, tab: TABS.CREATE, resume: { screen: restored.screen, tab: restored.tab ?? TABS.CREATE } };
  }

  // Ohne passende Karte (alles ausgeschlossen) direkt zum Abschluss statt in eine leere Runde.
  function enterRound(state) {
    const empty = isRoundComplete(roundOf(state), state.config);
    return { ...state, tab: TABS.CREATE, screen: empty ? SCREENS.COMPLETE : SCREENS.ROUND, endedEarly: false };
  }

  function reducer(state, action) {
    switch (action.type) {
      case 'go':
        return { ...state, tab: TABS.CREATE, screen: action.screen };
      case 'tab':
        return { ...state, tab: action.tab };
      // ---------- Registrierung ----------
      case 'registration':
        return { ...state, registration: { ...state.registration, ...action.changes } };
      case 'codeSent':
        return { ...state, screen: SCREENS.REGISTER_CODE, registration: { ...state.registration, ...action.request } };
      // Gültiger Code: Konto (nur Vorname und gekürzte Nummer) übernehmen, weiter zu „Über dich“.
      case 'verified':
        return { ...state, account: action.account, registration: EMPTY_REGISTRATION, screen: SCREENS.ABOUT };
      case 'welcomeContinue': {
        const resume = state.resume ?? { screen: firstScreen(state.config), tab: TABS.CREATE };
        return { ...state, screen: resume.screen === SCREENS.WELCOME_BACK ? firstScreen(state.config) : resume.screen, tab: resume.tab, resume: null };
      }
      // ---------- Onboarding ----------
      case 'about': {
        const account = action.firstName ? { ...(state.account ?? { phoneMasked: null, verifiedAt: null }), firstName: action.firstName } : state.account;
        return { ...state, person: action.person, account, screen: SCREENS.QUESTIONS, step: 0, editing: false };
      }
      case 'setAnswer':
        return { ...state, answers: { ...state.answers, [action.questionId]: action.value } };
      // Nach Frage 3 oder nach „Ändern“: Antworten übernehmen und zur Zusammenfassung.
      // Im Änderungsmodus führt jeder Schritt zurück zur Zusammenfassung.
      case 'step': {
        if (!state.editing && action.to < 0) return { ...state, screen: SCREENS.ABOUT };
        if (!state.editing && action.to < stage0.questions.length) return { ...state, step: action.to };
        const onboarding = deriveOnboarding(stage0, state.answers, { allergens, catalogIndex: index });
        // Antworten beim Wischen beginnen neu; Profiländerungen und Registrierung bleiben im Log.
        const events = state.events.filter((event) => eventType(event) !== ANSWER);
        return { ...state, onboarding, events, roundNumber: 1, roundMode: ROUND_MODES.MAIN, dishRound: 0, endedEarly: false, editing: false, screen: SCREENS.SUMMARY };
      }
      // „Ändern“ in der Zusammenfassung: direkt zur Frage, aus der die Regel stammt.
      case 'editAnswers':
        return { ...state, tab: TABS.CREATE, screen: SCREENS.QUESTIONS, step: action.step, editing: true };
      // „Stimmt so“: Regeln bestätigt, weiter zur ersten Karte (oder zum Tutorial).
      case 'confirmSummary':
        return screenAfterSummary(state.config) === SCREENS.ROUND ? enterRound(state) : { ...state, screen: SCREENS.INTRO };
      case 'startRound':
        return enterRound(state);
      // „Weiter mit Runde 2“ nach dem Abschluss: nächste Runde mit den noch offenen Karten (auch nach Gerichten).
      case 'nextRound': {
        const main = { ...state, roundMode: ROUND_MODES.MAIN };
        if (state.screen !== SCREENS.COMPLETE) return state;
        const number = nextRoundNumber(roundOf(main), state.config);
        return number === null ? state : enterRound({ ...main, roundNumber: number });
      }
      // Alltagsprofil öffnen und danach dorthin zurück, wo die Person war (Abschluss oder „Mein Profil“).
      case 'openPractical':
        return { ...state, practicalFrom: { screen: state.screen, tab: state.tab }, tab: TABS.CREATE, screen: SCREENS.PRACTICAL };
      case 'closePractical': {
        const from = state.practicalFrom ?? { screen: SCREENS.COMPLETE, tab: TABS.PROFILE };
        return { ...state, screen: from.screen === SCREENS.PRACTICAL ? SCREENS.COMPLETE : from.screen, tab: from.tab, practicalFrom: null };
      }
      // ---------- Ereignisse ----------
      // Antwort beim Wischen: kann die Runde abschliessen.
      case 'event': {
        const events = [...state.events, action.event];
        const answer = eventType(action.event) === ANSWER && action.event.response !== UNDO;
        const complete = answer && isRoundComplete(roundOf(state, events), state.config);
        return { ...state, events, screen: complete ? SCREENS.COMPLETE : state.screen, endedEarly: false };
      }
      // Profiländerung oder Registrierung: nur ins Log, der Bildschirm bleibt.
      case 'log':
        return { ...state, events: [...state.events, action.event] };
      case 'end':
        return { ...state, screen: SCREENS.COMPLETE, endedEarly: true };
      case 'restart':
        return { ...initialState(state.config), account: state.account, screen: state.account ? SCREENS.ABOUT : firstScreen(state.config) };
      // Abmelden: alles zurück auf Anfang, mit der aktuellen Konfiguration für die nächste Person.
      case 'signOut':
        return initialState(action.config ?? state.config);
      default:
        return state;
    }
  }

  return { initialState, reducer, roundOf, mainRoundOf };
}
