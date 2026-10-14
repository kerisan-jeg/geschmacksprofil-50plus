// Zustand und Ablauf der App als reine Funktionen (ohne React), damit der Ablauf testbar ist.
//
// Bildschirme im Bereich „Profil erstellen“:
//   start → login → questions → round → complete
// Nach Frage 3 erscheint direkt die erste Karte (Teamentscheid 13.10.: keine Zusammenfassung,
// kein Tutorial). Ist TUTORIAL_ENABLED eingeschaltet, kommt das Tutorial (intro) vor der Runde.
// Bereich „Mein Profil“: eigener Tab, der Ablauf oben bleibt dabei an seiner Stelle stehen.
//
// Das Event-Log (events) bleibt die einzige Quelle der Wahrheit für Antworten (A8):
// Der Zustand der Runde wird immer daraus abgeleitet (deriveRoundState → replay).

import { UNDO } from '../logic/answers.js';
import { deriveRoundState, isRoundComplete, progress } from '../logic/engine.js';
import { deriveOnboarding, emptyAnswers } from '../logic/stage0.js';

export const SCREENS = {
  START: 'start',
  LOGIN: 'login',
  QUESTIONS: 'questions',
  INTRO: 'intro',
  ROUND: 'round',
  COMPLETE: 'complete',
};

export const TABS = { CREATE: 'create', PROFILE: 'profile' };

export const EMPTY_PERSON = { firstName: '', ageGroup: null, participantCode: '', consent: false };

// Die untere Navigation erscheint erst nach der Anmeldung. In der Runde ist sie ausgeblendet,
// damit Karte und Knöpfe den ganzen Bildschirm haben; verlassen lässt sich die Runde oben links.
export function isNavVisible(state) {
  if (state.screen === SCREENS.START || state.screen === SCREENS.LOGIN) return false;
  return state.tab === TABS.PROFILE || state.screen !== SCREENS.ROUND;
}

// Nach Frage 3: Tutorial nur, wenn es eingeschaltet ist (TUTORIAL_ENABLED), sonst direkt die erste Karte.
export function screenAfterQuestions(config) {
  return config.tutorial ? SCREENS.INTRO : SCREENS.ROUND;
}

// Abschnitte der Profilerstellung für die Fortschrittsanzeige: Fragen → Runde 1 → Profil.
// state je Abschnitt: 'done' | 'current' | 'open'; die Runde trägt zusätzlich ihren Kartenfortschritt.
export function creationSteps(state, round) {
  const editingQuestions = state.screen === SCREENS.QUESTIONS || !state.onboarding;
  const roundDone = Boolean(state.onboarding) && state.screen === SCREENS.COMPLETE;
  const { answered, total } = round ? progress(round, state.config) : { answered: 0, total: 0 };
  let roundState = 'open';
  if (roundDone) roundState = 'done';
  else if (!editingQuestions) roundState = 'current';
  return [
    { id: 'questions', state: editingQuestions ? 'current' : 'done' },
    { id: 'round', state: roundState, answered, total },
    { id: 'profile', state: roundDone ? 'done' : 'open' },
  ];
}

export function createAppModel({ index, stage0, allergens }) {
  function roundOf(state, events = state.events) {
    return deriveRoundState({ index, onboarding: state.onboarding, diets: stage0.diets, events });
  }

  function initialState(config) {
    return {
      screen: SCREENS.START,
      tab: TABS.CREATE,
      config,
      person: EMPTY_PERSON,
      answers: emptyAnswers(stage0.questions),
      step: 0,
      onboarding: null,
      events: [],
      endedEarly: false,
    };
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
      case 'login':
        return { ...state, person: action.person, screen: SCREENS.QUESTIONS, step: 0 };
      case 'setAnswer':
        return { ...state, answers: { ...state.answers, [action.questionId]: action.value } };
      case 'step': {
        if (action.to < 0) return { ...state, screen: SCREENS.LOGIN };
        if (action.to < stage0.questions.length) return { ...state, step: action.to };
        const onboarding = deriveOnboarding(stage0, state.answers, { allergens, catalogIndex: index });
        const next = { ...state, onboarding, events: [], endedEarly: false };
        return screenAfterQuestions(state.config) === SCREENS.ROUND ? enterRound(next) : { ...next, screen: SCREENS.INTRO };
      }
      case 'startRound':
        return enterRound(state);
      case 'event': {
        const events = [...state.events, action.event];
        const complete = action.event.response !== UNDO && isRoundComplete(roundOf(state, events), state.config);
        return { ...state, events, screen: complete ? SCREENS.COMPLETE : state.screen, endedEarly: false };
      }
      case 'end':
        return { ...state, screen: SCREENS.COMPLETE, endedEarly: true };
      case 'restart':
        return initialState(state.config);
      default:
        return state;
    }
  }

  return { initialState, reducer, roundOf };
}
