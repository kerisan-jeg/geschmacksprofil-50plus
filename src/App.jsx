import { useEffect, useReducer, useState } from 'react';
import catalog from './data/catalog.json';
import stage0 from './data/stage0.json';
import { PRIVACY } from './config.js';
import { applyAnswer, createRound, isRoundComplete, nextCard, RULE_VERSION, selectionReason } from './logic/engine.js';
import { annotateFamilies, deriveRules, emptyAnswers } from './logic/stage0.js';
import { createLogger } from './logging/logger.js';
import StartScreen from './screens/StartScreen.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import QuestionnaireScreen from './screens/QuestionnaireScreen.jsx';
import SummaryScreen from './screens/SummaryScreen.jsx';
import IntroScreen from './screens/IntroScreen.jsx';
import RoundScreen from './screens/RoundScreen.jsx';
import ResultScreen from './screens/ResultScreen.jsx';

// Ablauf: Start → Anmelden → Fragebogen (Stufe 0) → Zusammenfassung → Erklärung → Runde → Zwischenstand
const FAMILIES = catalog.cards.filter((card) => card.level === 1);
const EMPTY_PROFILE = { firstName: '', ageGroup: null, participantCode: '', consent: false };

function initialState() {
  return {
    screen: 'start',
    profile: EMPTY_PROFILE,
    answers: emptyAnswers(stage0.questions),
    step: 0,
    rules: null,
    round: createRound(catalog.cards),
    history: [],
    endedEarly: false,
  };
}

// Harte Ausschlüsse aus Stufe 0 bestimmen den Kartenstapel der ersten Runde.
function buildRound(answers) {
  const rules = deriveRules(stage0, answers, catalog.cards);
  const cards = annotateFamilies(catalog.cards, rules);
  return { rules, round: createRound(cards, 1, { excludedIds: rules.excludedIds }) };
}

function unsureTexts(rules) {
  return (rules?.unsure ?? []).map((id) => stage0.questions.find((question) => question.id === id).unsureText);
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
      return { ...state, ...buildRound(state.answers), history: [], endedEarly: false, screen: 'summary' };
    }
    case 'editStage0':
      return { ...state, screen: 'questions', step: 0 };
    case 'card': {
      const round = applyAnswer(state.round, action.cardId, action.answer);
      if (round === state.round) return state;
      const complete = isRoundComplete(round);
      return {
        ...state,
        round,
        history: [...state.history, state.round],
        screen: complete ? 'result' : state.screen,
        endedEarly: complete ? false : state.endedEarly,
      };
    }
    case 'undo':
      if (state.history.length === 0) return state;
      return { ...state, round: state.history.at(-1), history: state.history.slice(0, -1) };
    case 'end':
      return { ...state, screen: 'result', endedEarly: true };
    case 'restart':
      return initialState();
    default:
      return state;
  }
}

export default function App() {
  // Ein Protokoll pro Testperson. „Nochmals von vorn“ beginnt ein neues.
  const [logger, setLogger] = useState(() => createLogger());
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const { screen, profile, answers, step, rules, round, history, endedEarly } = state;

  useEffect(() => {
    logger.log('screen', screen === 'questions' ? { screen, step } : { screen });
    window.scrollTo(0, 0);
  }, [screen, step, logger]);

  useEffect(() => {
    if (screen !== 'result') return;
    logger.log('round_end', {
      completed: !endedEarly,
      answered: round.sequence.length,
      openCardId: nextCard(round)?.id ?? null,
    });
    // Nur beim Wechsel auf den Zwischenstand protokollieren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Der Vorname bleibt nur auf dem Bildschirm; protokolliert wird nur, ob einer angegeben wurde.
  function handleLogin(nextProfile) {
    const meta = { participantCode: nextProfile.participantCode || null, ageGroup: nextProfile.ageGroup ?? null };
    logger.setMeta(meta);
    logger.log('login', { ...meta, consent: true, nameGiven: nextProfile.firstName !== '' });
    dispatch({ type: 'login', profile: nextProfile });
  }

  function handleConfirmStage0() {
    logger.log('stage0_confirm', {
      excludedIds: rules.excludedIds,
      constrainedCardIds: Object.keys(rules.badges),
      unsure: rules.unsure,
      ruleCount: rules.rules.length,
      deckSize: round.cards.length,
      ...(PRIVACY.logStage0Answers ? { answers } : {}),
    });
    dispatch({ type: 'go', screen: 'intro' });
  }

  function handleEditStage0() {
    logger.log('stage0_edit');
    dispatch({ type: 'editStage0' });
  }

  function startRound() {
    logger.log('round_start', { level: round.level, total: round.cards.length, deck: round.cards.map((card) => card.id) });
    dispatch({ type: 'go', screen: 'round' });
  }

  // Protokollfelder nach nurec v0.2, Kap. 6, ergänzt um Eingabeart und Antwortzeit.
  function handleAnswer(card, answer, method, responseMs, position) {
    logger.log('answer', {
      cardId: card.id,
      level: card.level,
      position,
      reason: selectionReason(round, card),
      ruleVersion: RULE_VERSION,
      answer,
      method,
      responseMs,
    });
    dispatch({ type: 'card', cardId: card.id, answer });
  }

  function handleUndo() {
    logger.log('undo', { cardId: round.sequence.at(-1) ?? null });
    dispatch({ type: 'undo' });
  }

  function handleRestart() {
    logger.log('restart');
    setLogger(createLogger());
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
          onChange={(questionId, value) => dispatch({ type: 'setAnswer', questionId, value })}
          onStep={(to) => dispatch({ type: 'step', to })}
        />
      );
    case 'summary':
      return (
        <SummaryScreen
          families={FAMILIES}
          rules={rules}
          round={round}
          unsureTexts={unsureTexts(rules)}
          firstName={profile.firstName}
          onConfirm={handleConfirmStage0}
          onEdit={handleEditStage0}
        />
      );
    case 'intro':
      return <IntroScreen onContinue={startRound} />;
    case 'round':
      return (
        <RoundScreen
          round={round}
          canUndo={history.length > 0}
          onAnswer={handleAnswer}
          onUndo={handleUndo}
          onEndRound={() => dispatch({ type: 'end' })}
        />
      );
    default:
      return (
        <ResultScreen
          round={round}
          endedEarly={endedEarly}
          firstName={profile.firstName}
          rules={rules}
          unsureTexts={unsureTexts(rules)}
          onRestart={handleRestart}
          onDownloadLog={() => logger.download()}
        />
      );
  }
}
