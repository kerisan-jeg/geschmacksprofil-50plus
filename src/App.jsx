import { useEffect, useReducer, useRef } from 'react';
import catalog from './data/catalog.json';
import { applyAnswer, createRound, isRoundComplete, nextCard, RULE_VERSION, selectionReason } from './logic/engine.js';
import { createLogger } from './logging/logger.js';
import StartScreen from './screens/StartScreen.jsx';
import IntroScreen from './screens/IntroScreen.jsx';
import RoundScreen from './screens/RoundScreen.jsx';
import ResultScreen from './screens/ResultScreen.jsx';

function initialState() {
  return { screen: 'start', round: createRound(catalog.cards), history: [], endedEarly: false };
}

// Alle Zustandswechsel an einem Ort. Der Reducer arbeitet immer mit dem aktuellen Stand,
// auch wenn eine Antwort erst nach der Wegflug-Animation eintrifft.
function reducer(state, action) {
  switch (action.type) {
    case 'go':
      return { ...state, screen: action.screen };
    case 'answer': {
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
  const loggerRef = useRef(null);
  if (!loggerRef.current) loggerRef.current = createLogger();
  const logger = loggerRef.current;

  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const { screen, round, history, endedEarly } = state;

  useEffect(() => {
    logger.log('screen', { screen });
    window.scrollTo(0, 0);
  }, [screen, logger]);

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

  function startRound() {
    logger.log('round_start', { level: round.level, total: round.cards.length });
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
    dispatch({ type: 'answer', cardId: card.id, answer });
  }

  function handleUndo() {
    logger.log('undo', { cardId: round.sequence.at(-1) ?? null });
    dispatch({ type: 'undo' });
  }

  function handleRestart() {
    logger.log('restart');
    dispatch({ type: 'restart' });
  }

  if (screen === 'start') {
    return <StartScreen total={round.cards.length} onStart={() => dispatch({ type: 'go', screen: 'intro' })} />;
  }
  if (screen === 'intro') {
    return <IntroScreen onContinue={startRound} />;
  }
  if (screen === 'round') {
    return (
      <RoundScreen
        round={round}
        canUndo={history.length > 0}
        onAnswer={handleAnswer}
        onUndo={handleUndo}
        onEndRound={() => dispatch({ type: 'end' })}
      />
    );
  }
  return (
    <ResultScreen
      round={round}
      endedEarly={endedEarly}
      onRestart={handleRestart}
      onDownloadLog={() => logger.download()}
    />
  );
}
