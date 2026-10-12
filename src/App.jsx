import { useEffect, useMemo, useReducer, useState } from 'react';
import catalog from './data/catalog.json';
import stage0 from './data/stage0.json';
import allergens from './data/allergens.json';
import { isAdminMode, resolveConfig } from './config.js';
import { indexCatalog } from './logic/catalog.js';
import { UNDO } from './logic/answers.js';
import {
  buildProfile,
  deriveRoundState,
  eligibleFamilies,
  isRoundComplete,
  nextCard,
  RULE_VERSION,
  selectionReason,
} from './logic/engine.js';
import { createRedundancyCheck, deriveOnboarding, emptyAnswers } from './logic/stage0.js';
import { createLogger } from './logging/logger.js';
import StartScreen from './screens/StartScreen.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import QuestionnaireScreen from './screens/QuestionnaireScreen.jsx';
import SummaryScreen from './screens/SummaryScreen.jsx';
import IntroScreen from './screens/IntroScreen.jsx';
import RoundScreen from './screens/RoundScreen.jsx';
import ResultScreen from './screens/ResultScreen.jsx';
import AdminScreen from './screens/AdminScreen.jsx';

// Ablauf: Start → Anmelden → Fragebogen (Stufe 0) → Zusammenfassung → Erklärung → Runde → Zwischenstand
const INDEX = indexCatalog(catalog.cards);
const FAMILIES = catalog.cards.filter((card) => card.stage === 1);
const EMPTY_PROFILE = { firstName: '', ageGroup: null, participantCode: '', consent: false };
// Effektive Werte aus Standard und URL (A10), einmal beim Laden bestimmt.
const CONFIG = resolveConfig(typeof window === 'undefined' ? '' : window.location.search);

function initialState(config = CONFIG) {
  return {
    screen: 'start',
    config,
    profile: EMPTY_PROFILE,
    answers: emptyAnswers(stage0.questions),
    step: 0,
    onboarding: null,
    // Event-Log der Runde: einzige Quelle der Wahrheit für Antworten, Ausschlüsse beim Wischen und Rückgängig.
    events: [],
    endedEarly: false,
  };
}

function roundOf(state, events = state.events) {
  return deriveRoundState({ index: INDEX, onboarding: state.onboarding, diets: stage0.diets, events });
}

// Alle Zustandswechsel an einem Ort. Der Reducer arbeitet immer mit dem aktuellen Stand,
// auch wenn eine Antwort erst nach der Wegflug-Animation eintrifft.
function reducer(state, action) {
  switch (action.type) {
    case 'go':
      return { ...state, screen: action.screen };
    case 'login':
      return { ...state, profile: action.profile, screen: 'questions', step: 0 };
    case 'setAnswer':
      return { ...state, answers: { ...state.answers, [action.questionId]: action.value } };
    case 'step': {
      if (action.to < 0) return { ...state, screen: 'login' };
      if (action.to < stage0.questions.length) return { ...state, step: action.to };
      const onboarding = deriveOnboarding(stage0, state.answers, { allergens, catalogIndex: INDEX });
      return { ...state, onboarding, events: [], endedEarly: false, screen: 'summary' };
    }
    case 'editStage0':
      return { ...state, screen: 'questions', step: 0 };
    case 'event': {
      const events = [...state.events, action.event];
      const complete = action.event.response !== UNDO && isRoundComplete(roundOf(state, events), state.config);
      return { ...state, events, screen: complete ? 'result' : state.screen, endedEarly: false };
    }
    case 'end':
      return { ...state, screen: 'result', endedEarly: true };
    case 'restart':
      return initialState(state.config);
    default:
      return state;
  }
}

// Ansicht für die Testleitung nur über ?admin=1 (A9); für Testpersonen nicht auffindbar.
export default function Root() {
  return isAdminMode(window.location.search) ? <AdminScreen /> : <App />;
}

function App() {
  // Ein Protokoll pro Testperson. „Nochmals von vorn“ beginnt ein neues.
  const [logger, setLogger] = useState(() => createLogger(CONFIG));
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const { screen, config, profile, answers, step, onboarding, events, endedEarly } = state;
  const round = useMemo(() => (onboarding ? roundOf(state) : null), [onboarding, events]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    logger.trace('screen', screen === 'questions' ? { screen, step } : { screen });
    window.scrollTo(0, 0);
  }, [screen, step, logger]);

  useEffect(() => {
    if (screen !== 'result' || !round) return;
    logger.trace('round_end', { completed: !endedEarly, answered: round.sequence.length });
    logger.finish(buildProfile(round));
    // Nur beim Wechsel auf den Zwischenstand protokollieren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Der Vorname bleibt nur auf dem Bildschirm; protokolliert wird nur, ob einer angegeben wurde.
  function handleLogin(nextProfile) {
    logger.start({ participantCode: nextProfile.participantCode, ageGroup: nextProfile.ageGroup });
    logger.trace('login', { consent: true, nameGiven: nextProfile.firstName !== '' });
    dispatch({ type: 'login', profile: nextProfile });
  }

  function handleConfirmStage0() {
    logger.setOnboarding(onboarding);
    logger.trace('stage0_confirm', { eligible: eligibleFamilies(round).map((card) => card.id) });
    // Ohne Tutorial (?tutorial=0) direkt zur ersten Karte.
    if (config.tutorial) dispatch({ type: 'go', screen: 'intro' });
    else startRound();
  }

  function handleEditStage0() {
    logger.trace('stage0_edit');
    dispatch({ type: 'editStage0' });
  }

  function startRound() {
    logger.trace('round_start', { roundCardLimit: config.roundCardLimit, tutorial: config.tutorial });
    dispatch({ type: 'go', screen: 'round' });
  }

  // Ein Antwort-Ereignis: genau dieses Objekt geht ins Protokoll und in den Zustand.
  function record(card, response, extra) {
    const event = {
      cardId: card.id,
      stage: card.stage,
      parentId: card.parentId,
      positionInRound: extra.positionInRound,
      response,
      timestamp: new Date().toISOString(),
      responseTimeMs: extra.responseTimeMs ?? null,
      inputMethod: extra.inputMethod,
      selectionReason: extra.selectionReason ?? selectionReason(round, card),
      ruleVersion: RULE_VERSION,
      ...(extra.excludedCardIds ? { excludedCardIds: extra.excludedCardIds } : {}),
    };
    dispatch({ type: 'event', event: logger.recordEvent(event) });
  }

  function handleAnswer(card, response, inputMethod, responseTimeMs, positionInRound, excludedCardIds) {
    record(card, response, { inputMethod, responseTimeMs, positionInRound, excludedCardIds });
  }

  function handleUndo() {
    const last = round?.lastEvent;
    if (!last) return;
    const card = INDEX.get(last.cardId);
    record(card, UNDO, { inputMethod: 'button', positionInRound: last.positionInRound, selectionReason: 'undo' });
  }

  function handleRestart() {
    logger.trace('restart');
    setLogger(createLogger(config));
    dispatch({ type: 'restart' });
  }

  switch (screen) {
    case 'start':
      return <StartScreen onStart={() => dispatch({ type: 'go', screen: 'login' })} />;
    case 'login':
      return <LoginScreen profile={profile} onSubmit={handleLogin} onBack={() => dispatch({ type: 'go', screen: 'start' })} />;
    case 'questions':
      return (
        <QuestionnaireScreen
          questions={stage0.questions}
          step={step}
          answers={answers}
          firstName={profile.firstName}
          allergens={allergens}
          catalogIndex={INDEX}
          redundancy={createRedundancyCheck(stage0, answers, { allergens, catalogIndex: INDEX, upTo: step })}
          onChange={(questionId, value) => dispatch({ type: 'setAnswer', questionId, value })}
          onStep={(to) => dispatch({ type: 'step', to })}
        />
      );
    case 'summary': {
      const eligible = eligibleFamilies(round).map((card) => card.id);
      return (
        <SummaryScreen
          families={FAMILIES}
          eligibleIds={eligible}
          roundSize={Math.min(config.roundCardLimit, eligible.length)}
          onboarding={onboarding}
          firstName={profile.firstName}
          onConfirm={handleConfirmStage0}
          onEdit={handleEditStage0}
        />
      );
    }
    case 'intro':
      return <IntroScreen onContinue={startRound} />;
    case 'round':
      if (!nextCard(round, config)) return null;
      return (
        <RoundScreen
          round={round}
          config={config}
          canUndo={Boolean(round.lastEvent)}
          onAnswer={handleAnswer}
          onUndo={handleUndo}
          onEndRound={() => dispatch({ type: 'end' })}
        />
      );
    default:
      return (
        <ResultScreen
          round={round}
          index={INDEX}
          endedEarly={endedEarly}
          firstName={profile.firstName}
          onboarding={onboarding}
          onRestart={handleRestart}
        />
      );
  }
}
