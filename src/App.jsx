import { useEffect, useMemo, useReducer, useState } from 'react';
import catalog from './data/catalog.json';
import stage0 from './data/stage0.json';
import allergens from './data/allergens.json';
import { isAdminMode, resolveConfig } from './config.js';
import { QUESTIONS } from './labels.js';
import { indexCatalog } from './logic/catalog.js';
import { UNDO } from './logic/answers.js';
import { buildProfile, eligibleFamilies, RULE_VERSION, selectionReason } from './logic/engine.js';
import { createRedundancyCheck } from './logic/stage0.js';
import { createLogger, storageAvailable } from './logging/logger.js';
import { createAppModel, creationSteps, isNavVisible, SCREENS, TABS } from './app/model.js';
import { ImageStyleContext } from './lib/images.js';
import BottomNav from './components/BottomNav.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import StartScreen from './screens/StartScreen.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import QuestionnaireScreen from './screens/QuestionnaireScreen.jsx';
import IntroScreen from './screens/IntroScreen.jsx';
import RoundScreen from './screens/RoundScreen.jsx';
import CompleteScreen from './screens/CompleteScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import AdminScreen from './screens/AdminScreen.jsx';

// Ablauf „Profil erstellen“: Start → Anmelden → Fragebogen (Stufe 0) → Runde → Abschluss
// (Tutorial vor der Runde nur mit TUTORIAL_ENABLED). Daneben „Mein Profil“ als zweiter Bereich der
// unteren Navigation. Zustandswechsel: app/model.js.
const INDEX = indexCatalog(catalog.cards);
const DIET_OPTIONS = stage0.questions.find((question) => question.id === 'diet')?.options ?? [];
const MODEL = createAppModel({ index: INDEX, stage0, allergens });
// Effektive Werte aus Standard und URL (A10), einmal beim Laden bestimmt.
const CONFIG = resolveConfig(typeof window === 'undefined' ? '' : window.location.search);

// Ansicht für die Testleitung nur über ?admin=1 (A9); für Testpersonen nicht auffindbar.
export default function Root() {
  return <ErrorBoundary>{isAdminMode(window.location.search) ? <AdminScreen /> : <App />}</ErrorBoundary>;
}

function App() {
  // Ein Protokoll pro Testperson. „Von vorn beginnen“ beginnt ein neues.
  const [logger, setLogger] = useState(() => createLogger(CONFIG));
  const [storageOk] = useState(() => storageAvailable());
  const [state, dispatch] = useReducer(MODEL.reducer, CONFIG, MODEL.initialState);
  const { screen, tab, config, person, answers, step, onboarding, events, endedEarly } = state;
  const round = useMemo(() => (onboarding ? MODEL.roundOf(state) : null), [onboarding, events]); // eslint-disable-line react-hooks/exhaustive-deps
  const navVisible = isNavVisible(state);
  const steps = creationSteps(state, round);

  useEffect(() => {
    logger.trace('screen', screen === SCREENS.QUESTIONS ? { screen, step, tab } : { screen, tab });
    window.scrollTo(0, 0);
  }, [screen, step, tab, logger]);

  // Onboarding beim Abschluss von Frage 3 einmal übernehmen, vor dem ersten Swipe.
  useEffect(() => {
    if (!onboarding) return;
    logger.setOnboarding(onboarding);
    logger.trace('stage0_confirm', { eligible: eligibleFamilies(round).map((card) => card.id) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarding, logger]);

  useEffect(() => {
    if (screen === SCREENS.ROUND) logger.trace('round_start', { roundCardLimit: config.roundCardLimit, tutorial: config.tutorial });
    // Nur beim Wechsel in die Runde protokollieren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen === SCREENS.ROUND]);

  useEffect(() => {
    if (screen !== SCREENS.COMPLETE || !round) return;
    logger.trace('round_end', { completed: !endedEarly, answered: round.sequence.length });
    logger.finish(buildProfile(round));
    // Nur beim Wechsel auf den Abschluss protokollieren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Der Vorname bleibt nur auf dem Bildschirm; protokolliert wird nur, ob einer angegeben wurde.
  function handleLogin(nextPerson) {
    logger.start({ participantCode: nextPerson.participantCode, ageGroup: nextPerson.ageGroup });
    logger.trace('login', { consent: true, nameGiven: nextPerson.firstName !== '' });
    dispatch({ type: 'login', person: nextPerson });
  }

  function handleStartRound() {
    dispatch({ type: 'startRound' });
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
    record(INDEX.get(last.cardId), UNDO, { inputMethod: 'button', positionInRound: last.positionInRound, selectionReason: 'undo' });
  }

  function handleTab(nextTab) {
    if (nextTab === tab) return;
    logger.trace('tab', { tab: nextTab });
    dispatch({ type: 'tab', tab: nextTab });
  }

  function handleRestart() {
    logger.trace('restart');
    setLogger(createLogger(config));
    dispatch({ type: 'restart' });
  }

  function renderCreate() {
    switch (screen) {
      case SCREENS.START:
        return <StartScreen storageAvailable={storageOk} onStart={() => dispatch({ type: 'go', screen: SCREENS.LOGIN })} />;
      case SCREENS.LOGIN:
        return <LoginScreen person={person} onSubmit={handleLogin} onBack={() => dispatch({ type: 'go', screen: SCREENS.START })} />;
      case SCREENS.QUESTIONS:
        return (
          <QuestionnaireScreen
            key={step}
            questions={stage0.questions}
            step={step}
            answers={answers}
            firstName={person.firstName}
            allergens={allergens}
            catalogIndex={INDEX}
            redundancy={createRedundancyCheck(stage0, answers, { allergens, catalogIndex: INDEX, upTo: step })}
            onChange={(questionId, value) => dispatch({ type: 'setAnswer', questionId, value })}
            onStep={(to) => dispatch({ type: 'step', to })}
            lastLabel={config.tutorial ? QUESTIONS.next : QUESTIONS.toRound}
          />
        );
      case SCREENS.INTRO:
        return <IntroScreen onContinue={handleStartRound} />;
      case SCREENS.ROUND:
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
          <CompleteScreen
            round={round}
            endedEarly={endedEarly}
            firstName={person.firstName}
            ruleCount={onboarding.rules.filter((rule) => rule.kind !== 'note').length + round.swipeExclusions.length}
            steps={steps}
            onToProfile={() => handleTab(TABS.PROFILE)}
          />
        );
    }
  }

  return (
    <ImageStyleContext.Provider value={config.imageStyle}>
      <div className="app" data-nav={navVisible ? '' : undefined}>
        {tab === TABS.PROFILE && navVisible ? (
          <ProfileScreen
            round={round}
            onboarding={onboarding}
            index={INDEX}
            allergens={allergens}
            dietOptions={DIET_OPTIONS}
            steps={steps}
            onCreate={() => handleTab(TABS.CREATE)}
            onRestart={handleRestart}
          />
        ) : (
          renderCreate()
        )}
        {navVisible && <BottomNav active={tab} onSelect={handleTab} />}
      </div>
    </ImageStyleContext.Provider>
  );
}
