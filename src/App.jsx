import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import catalog from './data/catalog.json';
import stage0 from './data/stage0.json';
import allergens from './data/allergens.json';
import foodList from './data/foods.json';
import { cardLimit, isAdminMode, normalizeConfig, resolveConfig } from './config.js';
import { ImageFilterContext, ImageStyleContext } from './lib/images.js';
import { ScaleConfigContext } from './components/answerMeta.js';
import { labelShown, scaleVariant } from './logic/scale.js';
import { roundOverview } from './logic/rounds.js';
import { indexCatalog } from './logic/catalog.js';
import { UNDO } from './logic/answers.js';
import { buildProfile, creationProgress, eligibleFamilies, hasMoreCards, isDishRound, isHoldoutCard, nextCard, nextRoundCards, nextRoundNumber, RULE_VERSION, selectionReason, selectNextCards } from './logic/engine.js';
import {
  ANSWER,
  AUTH_COMPLETED,
  AUTH_STARTED,
  DIET_CHANGED,
  EXCLUSION_ADDED,
  EXCLUSION_REMOVED,
  HOLDOUT_DRAWN,
  PHASE_DISH,
  PHASE_HOLDOUT,
  PHASE_MAIN,
  NAVIGATION,
  NAVIGATION_ACTIONS,
  QUESTION_ABORTED,
  RATING_CHANGED,
  SOURCE_PROFILE,
} from './logic/events.js';
import { drawHoldout } from './logic/holdout.js';
import { createRedundancyCheck } from './logic/stage0.js';
import { displayCardTitle } from './logic/filter.js';
import { mergeFoods } from './logic/foodSearch.js';
import { summarySections } from './logic/profile.js';
import { createLogger, storageAvailable } from './logging/logger.js';
import { createAppModel, creationSteps, hasProgress, isNavVisible, ROUND_MODES, SCREENS, TABS } from './app/model.js';
import { clearAppState, loadAccount, loadAppState, saveAccount, saveAppState, signOutLocally } from './storage/local.js';
import BottomNav from './components/BottomNav.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import StartScreen from './screens/StartScreen.jsx';
import RegisterNameScreen from './screens/RegisterNameScreen.jsx';
import WelcomeBackScreen from './screens/WelcomeBackScreen.jsx';
import AboutScreen from './screens/AboutScreen.jsx';
import QuestionnaireScreen from './screens/QuestionnaireScreen.jsx';
import SummaryScreen from './screens/SummaryScreen.jsx';
import IntroScreen from './screens/IntroScreen.jsx';
import RoundScreen from './screens/RoundScreen.jsx';
import CompleteScreen from './screens/CompleteScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import AdminScreen from './screens/AdminScreen.jsx';

// Ablauf „Profil erstellen“: Begrüssung → Anmeldung (nur Vorname) → Über dich → Fragebogen (Stufe 0) →
// Zusammenfassung → höchstens vier Runden mit Abschluss (Tutorial vor Runde 1 nur mit TUTORIAL_ENABLED).
// Die Karten wählt src/logic/selection.js je nach Antwort; die Kontrollkarten (Messkonzept, docs/messkonzept.md)
// kommen am Ende von Runde 2. Runde 3 enthält konkrete Lebensmittel, Runde 4 die passendsten Gerichte im selben Kartenlimit.
// Daneben „Mein Profil“ als zweiter Bereich der unteren Navigation. Zustandswechsel: app/model.js.
const INDEX = indexCatalog(catalog.cards);
// Lebensmittel für die Suche: handgepflegte Schweizer Begriffe, dann die Schweizer Nährwertdatenbank (BLV).
const FOODS = mergeFoods(catalog.foods ?? [], foodList.foods);
const DIET_QUESTION = stage0.questions.find((question) => question.id === 'diet');
const STAGE0_FOR_PROFILE = {
  definition: stage0,
  options: DIET_QUESTION?.options ?? [],
  // Frage 1, Teil B (ohne reine Vorschläge wie Gelatine) und Teil C für die Anzeige
  exclusions: (DIET_QUESTION?.exclusions ?? []).filter((entry) => !entry.suggestOnly),
  rules: DIET_QUESTION?.rules ?? [],
  diets: stage0.diets,
  tagLabels: stage0.questions.find((question) => question.id === 'never')?.tagLabels ?? {},
};
const MODEL = createAppModel({ index: INDEX, stage0, allergens });
// Effektive Werte aus Standard und URL (A10), einmal beim Laden bestimmt.
const CONFIG = resolveConfig(typeof window === 'undefined' ? '' : window.location.search);

// Ansicht für die Testleitung nur über ?admin=1 (A9); für Testpersonen nicht auffindbar.
export default function Root() {
  return <ErrorBoundary>{isAdminMode(window.location.search) ? <AdminScreen /> : <App />}</ErrorBoundary>;
}

// Gespeicherter Stand beim Öffnen: Wer schon da war, wird mit Namen begrüsst und macht weiter.
function boot() {
  const saved = loadAppState();
  const account = loadAccount();
  const config = normalizeConfig(saved?.state?.config ?? CONFIG);
  return { saved, account, config };
}

function App() {
  const [initial] = useState(boot);
  // Ein Protokoll pro Testperson; nach einem Neuladen geht dieselbe Sitzung weiter.
  const [logger, setLogger] = useState(() =>
    createLogger(initial.config, { resumeSessionId: initial.saved?.sessionId ?? null, seedEvents: initial.saved?.state?.events ?? [] })
  );
  const [storageOk] = useState(() => storageAvailable());
  const [state, dispatch] = useReducer(MODEL.reducer, initial, ({ config, account, saved }) => MODEL.initialState(config, { account, saved }));
  const { screen, tab, config, account, person, registration, answers, step, editing, onboarding, events, roundNumber, roundMode, dishRound, endedEarly } = state;
  // Laufende Runde (Profilerstellung oder Gerichte) und die Profilerstellung selbst (für Dashboard und „Weiter mit Runde N“)
  const round = useMemo(() => (onboarding ? MODEL.roundOf(state) : null), [onboarding, events, roundNumber, roundMode, dishRound]); // eslint-disable-line react-hooks/exhaustive-deps
  const mainRound = useMemo(() => (onboarding ? MODEL.mainRoundOf(state) : null), [onboarding, events, roundNumber]); // eslint-disable-line react-hooks/exhaustive-deps
  const progress = useMemo(() => (mainRound ? creationProgress(mainRound, config) : null), [mainRound, config]);
  const moreRounds = Boolean(mainRound) && hasMoreCards(mainRound, config);
  // Rundenübersicht (Verbesserung 7): Status je Runde aus dem Event-Log
  const rounds = useMemo(() => (onboarding ? roundOverview({ index: INDEX, onboarding, diets: stage0.diets, events, config }) : null), [onboarding, events, config]);
  const navVisible = isNavVisible(state);
  const steps = creationSteps(state, round);
  // Bilder zeigen nie, was die Person ausgeschlossen hat (siehe allowedPhotos in lib/images.js).
  const imageFilter = useMemo(() => (round ? { index: INDEX, exclusions: round.exclusions } : null), [round]);
  const firstName = account?.firstName ?? '';

  useEffect(() => {
    logger.trace('screen', screen === SCREENS.QUESTIONS ? { screen, step, tab } : { screen, tab });
    window.scrollTo(0, 0);
  }, [screen, step, tab, logger]);

  // Stand nur lokal speichern, sobald es etwas zum Weitermachen gibt.
  useEffect(() => {
    if (screen === SCREENS.WELCOME_BACK || !hasProgress(state)) return;
    saveAppState(state, logger.session.sessionId);
  }, [state, logger, screen]);

  // Angaben aus Stufe 0 ins Protokoll, sobald sie übernommen sind (nach Frage 3 und nach jedem „Ändern“).
  // Bestätigt werden sie in der Zusammenfassung (stage0_confirm), vor dem ersten Swipe.
  useEffect(() => {
    if (!onboarding || screen === SCREENS.WELCOME_BACK) return;
    logger.setOnboarding(onboarding);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarding, logger]);

  useEffect(() => {
    if (screen === SCREENS.ROUND) {
      logger.trace('round_start', { round: round?.round ?? roundNumber, mode: roundMode ?? ROUND_MODES.MAIN, roundCardLimit: config.roundCardLimit, tutorial: config.tutorial, selection: config.selection ?? 'fixed' });
    }
    // Nur beim Wechsel in eine Runde protokollieren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen === SCREENS.ROUND, roundNumber, roundMode, dishRound]);

  useEffect(() => {
    if (screen !== SCREENS.COMPLETE || !round) return;
    logger.trace('round_end', { round: round.round, completed: !endedEarly, answered: round.roundSequence.length, percent: progress?.percent ?? null });
    logger.finish({ ...buildProfile(mainRound), progress });
    // Nur beim Wechsel auf den Abschluss protokollieren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ---------- Ereignisse ----------

  // Ereignis ohne Antwort beim Wischen (Anmeldung, Profil): ins Protokoll und ins Event-Log.
  function log(event) {
    dispatch({ type: 'log', event: logger.recordEvent({ timestamp: new Date().toISOString(), ...event }) });
  }

  // Profiländerung: immer source "profile". Die ursprüngliche Antwort beim Wischen bleibt unverändert.
  function profileChange(event) {
    log({ ...event, source: SOURCE_PROFILE });
  }

  const profileHandlers = {
    rating: (cardId, rating, previousRating) =>
      profileChange({ type: RATING_CHANGED, cardId, rating, previousRating: previousRating ?? null, ...(rating ? scaleFields(INDEX.get(cardId), rating) : {}) }),
    // Vermutung der App direkt bewertet: wird zur direkten Bewertung; die Vermutung vorher bleibt im Log.
    confirmPrediction: (cardId, rating, predictedScore) =>
      profileChange({ type: RATING_CHANGED, cardId, rating, previousRating: null, fromPrediction: true, predictedScore, ...scaleFields(INDEX.get(cardId), rating) }),
    addExclusions: (section, exclusions) => exclusions.length && profileChange({ type: EXCLUSION_ADDED, section, exclusions }),
    removeExclusions: (section, exclusions) => exclusions.length && profileChange({ type: EXCLUSION_REMOVED, section, exclusions }),
    diet: (diet, previousDiet) => profileChange({ type: DIET_CHANGED, diet, previousDiet }),
  };

  // Das protokollierte Profil folgt Änderungen in „Mein Profil“ (nach Ende der Runde).
  useEffect(() => {
    if (mainRound && logger.session.endedAt) logger.updateProfile({ ...buildProfile(mainRound), progress });
  }, [mainRound, logger, progress]);

  // ---------- Anmeldung (nur Vorname) ----------

  function handleStart() {
    log({ type: AUTH_STARTED });
    dispatch({ type: 'go', screen: SCREENS.REGISTER_NAME });
  }

  // Vorname bestätigt: ins Konto auf dem Gerät und als participantName in die Sitzung (für die Testleitung).
  function handleRegister(name) {
    saveAccount({ firstName: name });
    logger.setParticipantName(name);
    log({ type: AUTH_COMPLETED, method: 'name' });
    dispatch({ type: 'register', firstName: name });
  }

  // ---------- Onboarding und Runde ----------

  // Für die Auswertung: Teilnehmer-Nr. und Altersgruppe. Ohne Anmeldung kann der Vorname hier freiwillig kommen.
  function handleAbout({ person: nextPerson, firstName: givenName }) {
    logger.start({ participantCode: nextPerson.participantCode, ageGroup: nextPerson.ageGroup });
    logger.trace('about', { consent: true, nameGiven: Boolean(givenName || firstName) });
    if (givenName) {
      saveAccount({ ...(account ?? {}), firstName: givenName });
      logger.setParticipantName(givenName);
    }
    dispatch({ type: 'about', person: nextPerson, firstName: givenName });
  }

  // Zusammenfassung: „Stimmt so“ bestätigt die festen Regeln, „Ändern“ öffnet die Frage, aus der sie stammen.
  // Danach werden die Kontrollkarten gezogen: nach den Ausschlüssen aus Stufe 0, vor der ersten Karte.
  function handleConfirmSummary() {
    logger.trace('stage0_confirm', { eligible: eligibleFamilies(round).map((card) => card.id) });
    const holdout = drawHoldout(round, { count: Math.min(config.holdout ?? 0, cardLimit(config)), seed: logger.session.sessionId });
    if (holdout.cardIds.length > 0) log({ type: HOLDOUT_DRAWN, ...holdout });
    dispatch({ type: 'confirmSummary' });
  }

  function handleEditAnswers(questionId) {
    logger.trace('stage0_edit', { question: questionId });
    dispatch({ type: 'editAnswers', step: stage0.questions.findIndex((question) => question.id === questionId) });
  }

  function handleStartRound() {
    dispatch({ type: 'startRound' });
  }

  function handleNextRound() {
    dispatch({ type: 'nextRound' });
  }

  // Navigation (Verbesserung 7): eigenes Ereignis, keine Antwort; verändert keine Antwortzeit.
  function handleNavigate(action, extra = {}) {
    log({ type: NAVIGATION, action, round: round?.round ?? null, ...extra });
  }

  function handleResumeRound(number) {
    handleNavigate(NAVIGATION_ACTIONS.ROUND_RESUME, { round: number, fromRound: round?.round ?? null });
    dispatch({ type: 'resumeRound', round: number });
  }

  // „Runde beenden“: Die Karte, die gerade zu sehen war, als Abbruch protokollieren (nurec v0.2, Kap. 6).
  // In Runde 4 ist das der vorgesehene Weg, die Gerichte zu beenden (phase dish zählt nicht als Abbruch).
  function handleEndRound(image = null) {
    const card = nextCard(round, config);
    if (card) {
      log({
        ...(image ? { imageShown: image.imageShown, imageSource: image.imageSource } : {}),
        type: QUESTION_ABORTED,
        cardId: card.id,
        stage: card.stage,
        round: round.round,
        positionInRound: round.roundSequence.length + 1,
        phase: phaseOf(card),
        selectionReason: selectionReason(round, card, config),
        ruleVersion: RULE_VERSION,
      });
    }
    dispatch({ type: 'end' });
  }

  // Nächster sinnvoller Schritt für „Mein Profil“ (Anhang B1)
  function nextStep() {
    if (!mainRound) return null;
    if (screen !== SCREENS.COMPLETE) return { type: 'continue' };
    if (moreRounds) return { type: 'round', number: nextRoundNumber(mainRound, config), titles: nextRoundCards(mainRound, config).slice(0, 3).map((card) => displayCardTitle(card, INDEX, mainRound.exclusions)) };
    return { type: 'done' };
  }

  function handleNextStep(next) {
    if (next.type === 'round') {
      handleTab(TABS.CREATE);
      handleNextRound();
    } else handleTab(TABS.CREATE);
  }

  // Phase einer Antwort: normale Auswahl, Kontrollkarte oder Gericht (Stufe 4).
  function phaseOf(card) {
    if (isDishRound(round.round)) return PHASE_DISH;
    return isHoldoutCard(round, card.id) ? PHASE_HOLDOUT : PHASE_MAIN;
  }

  // Ein Antwort-Ereignis: genau dieses Objekt geht ins Protokoll und in den Zustand.
  // alternatives: die nächsten Kandidaten, die stattdessen hätten kommen können (nurec v0.2, Anhang B3.2:
  // „nicht gezeigte Kandidaten“ protokollieren, damit sich später prüfen lässt, was überhaupt angeboten wurde).
  function record(card, response, extra) {
    const event = {
      type: ANSWER,
      cardId: card.id,
      stage: card.stage,
      kind: card.kind ?? null,
      parentId: card.parentId,
      round: round.round,
      positionInRound: extra.positionInRound,
      phase: phaseOf(card),
      response,
      timestamp: new Date().toISOString(),
      responseTimeMs: extra.responseTimeMs ?? null,
      inputMethod: extra.inputMethod,
      selectionReason: extra.selectionReason ?? selectionReason(round, card, config),
      ruleVersion: RULE_VERSION,
      source: 'swipe',
      ...(response !== UNDO ? { alternatives: selectNextCards(round, config).filter((entry) => entry.id !== card.id).slice(0, 5).map((entry) => entry.id) } : {}),
      ...(extra.excludedCardIds ? { excludedCardIds: extra.excludedCardIds } : {}),
      // Esskultur als Metadatum der Gerichte (Verbesserung 6), für die Auswertung
      ...(card.cuisines ? { cuisines: card.cuisines } : {}),
      // A15: Wurde ein Bild gezeigt (sonst Platzhalter), und welche Quelle hatte es?
      ...(response !== UNDO && extra.image ? { imageShown: extra.image.imageShown, imageSource: extra.image.imageSource } : {}),
      // Verbesserung 3: gezeigter Begriff und Variante (die Antwortwerte bleiben DISLIKE, LIKE, PREFER …)
      ...(response !== UNDO ? scaleFields(card, response) : {}),
    };
    dispatch({ type: 'event', event: logger.recordEvent(event) });
  }

  function scaleFields(card, response) {
    const variant = scaleVariant(card, config);
    return { scaleVariant: variant, labelShown: labelShown(variant, response) };
  }

  function handleAnswer(card, response, inputMethod, responseTimeMs, positionInRound, excludedCardIds, variant, image) {
    record(card, response, { inputMethod, responseTimeMs, positionInRound, excludedCardIds, image });
  }

  function handleUndo() {
    const last = round?.lastEvent;
    if (!last) return;
    record(INDEX.get(last.cardId), UNDO, { inputMethod: 'button', positionInRound: last.positionInRound, selectionReason: 'undo' });
  }

  const handleTab = useCallback(
    (nextTab) => {
      if (nextTab === tab) return;
      logger.trace('tab', { tab: nextTab });
      dispatch({ type: 'tab', tab: nextTab });
    },
    [tab, logger]
  );

  // Abmelden: Konto und Stand auf diesem Gerät löschen. Die Sitzung für die Auswertung bleibt.
  function handleSignOut() {
    logger.trace('sign_out');
    signOutLocally();
    setLogger(createLogger(CONFIG));
    dispatch({ type: 'signOut', config: CONFIG });
  }

  function handleRestart() {
    logger.trace('restart');
    clearAppState();
    setLogger(createLogger(config));
    dispatch({ type: 'restart' });
  }

  function renderCreate() {
    switch (screen) {
      case SCREENS.START:
        return <StartScreen storageAvailable={storageOk} onStart={handleStart} />;
      case SCREENS.REGISTER_NAME:
        return (
          <RegisterNameScreen
            firstName={registration.firstName}
            onChange={(value) => dispatch({ type: 'registration', changes: { firstName: value } })}
            onNext={handleRegister}
            onBack={() => dispatch({ type: 'go', screen: SCREENS.START })}
          />
        );
      case SCREENS.WELCOME_BACK:
        return <WelcomeBackScreen account={account} onContinue={() => dispatch({ type: 'welcomeContinue' })} onSignOut={handleSignOut} />;
      case SCREENS.ABOUT:
        return (
          <AboutScreen
            person={person}
            askName={!config.auth}
            firstName={firstName}
            onSubmit={handleAbout}
          />
        );
      case SCREENS.QUESTIONS:
        return (
          <QuestionnaireScreen
            key={step}
            definition={stage0}
            questions={stage0.questions}
            step={step}
            answers={answers}
            firstName={firstName}
            allergens={allergens}
            catalogIndex={INDEX}
            foods={FOODS}
            redundancy={createRedundancyCheck(stage0, answers, { allergens, catalogIndex: INDEX, upTo: step })}
            onChange={(questionId, value) => dispatch({ type: 'setAnswer', questionId, value })}
            onStep={(to) => dispatch({ type: 'step', to })}
            onOpenProfile={() => handleTab(TABS.PROFILE)}
            editing={editing}
          />
        );
      case SCREENS.SUMMARY:
        return (
          <SummaryScreen
            sections={summarySections(round, { onboarding, diets: stage0.diets, allergens, index: INDEX, dietRules: DIET_QUESTION?.rules })}
            noCards={eligibleFamilies(round).length === 0}
            firstName={firstName}
            steps={steps}
            onConfirm={handleConfirmSummary}
            onEdit={handleEditAnswers}
            onOpenProfile={() => handleTab(TABS.PROFILE)}
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
            onEndRound={handleEndRound}
            rounds={rounds}
            onNavigate={handleNavigate}
          />
        );
      default:
        return (
          <CompleteScreen
            round={round}
            mode={roundMode ?? ROUND_MODES.MAIN}
            progress={progress}
            endedEarly={endedEarly}
            firstName={firstName}
            ruleCount={round.entries.filter((entry) => !entry.freeText).length + (round.diet && round.diet !== 'none' ? 1 : 0)}
            steps={steps}
            nextTitles={moreRounds ? nextRoundCards(mainRound, config).map((card) => displayCardTitle(card, INDEX, mainRound.exclusions)) : []}
            nextNumber={nextRoundNumber(mainRound, config)}
            onNextRound={handleNextRound}
            rounds={rounds}
            onResumeRound={handleResumeRound}
            onToProfile={() => handleTab(TABS.PROFILE)}
          />
        );
    }
  }

  return (
    <ScaleConfigContext.Provider value={config}>
    <ImageStyleContext.Provider value={config.imageStyle}>
      <ImageFilterContext.Provider value={imageFilter}>
        <div className="app" data-nav={navVisible ? '' : undefined}>
          {tab === TABS.PROFILE && navVisible ? (
            <ProfileScreen
              round={mainRound}
              config={config}
              onboarding={onboarding}
              account={account}
              index={INDEX}
              allergens={allergens}
              foods={FOODS}
              dietOptions={STAGE0_FOR_PROFILE}
              steps={steps}
              next={nextStep()}
              canSignOut={Boolean(account)}
              onCreate={() => handleTab(TABS.CREATE)}
              onNext={handleNextStep}
              onRestart={handleRestart}
              onSignOut={handleSignOut}
              onChange={profileHandlers}
            />
          ) : (
            renderCreate()
          )}
          {navVisible && <BottomNav active={tab} onSelect={handleTab} />}
        </div>
      </ImageFilterContext.Provider>
    </ImageStyleContext.Provider>
    </ScaleConfigContext.Provider>
  );
}
