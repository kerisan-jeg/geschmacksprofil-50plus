import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import catalog from './data/catalog.json';
import stage0 from './data/stage0.json';
import allergens from './data/allergens.json';
import foodList from './data/foods.json';
import practicalDefinition from './data/practical.json';
import { cardLimit, isAdminMode, normalizeConfig, resolveConfig } from './config.js';
import { ImageFilterContext, ImageStyleContext } from './lib/images.js';
import { indexCatalog } from './logic/catalog.js';
import { UNDO } from './logic/answers.js';
import { buildProfile, eligibleFamilies, hasMoreCards, isDishRound, isHoldoutCard, nextCard, nextRoundCards, nextRoundNumber, RULE_VERSION, selectionReason, selectNextCards } from './logic/engine.js';
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
  PRACTICAL_SAVED,
  QUESTION_ABORTED,
  RATING_CHANGED,
  SOURCE_PROFILE,
} from './logic/events.js';
import { profileProgress } from './logic/dashboard.js';
import { practicalAnswered, practicalOf } from './logic/practical.js';
import { drawHoldout } from './logic/holdout.js';
import { createRedundancyCheck } from './logic/stage0.js';
import { displayCardTitle } from './logic/filter.js';
import { mergeFoods } from './logic/foodSearch.js';
import { summarySections } from './logic/profile.js';
import { createLogger, storageAvailable } from './logging/logger.js';
import { createAppModel, creationSteps, hasProgress, isNavVisible, ROUND_MODES, SCREENS, TABS } from './app/model.js';
import { createAuthService } from './auth/AuthService.js';
import { RECAPTCHA_CONTAINER_ID } from './auth/FirebaseAuthService.js';
import { countryById, formatPhoneInput, maskPhone } from './auth/phone.js';
import { clearAppState, loadAccount, loadAppState, saveAccount, saveAppState, signOutLocally } from './storage/local.js';
import BottomNav from './components/BottomNav.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import SmsBanner from './components/SmsBanner.jsx';
import StartScreen from './screens/StartScreen.jsx';
import RegisterNameScreen from './screens/RegisterNameScreen.jsx';
import RegisterPhoneScreen from './screens/RegisterPhoneScreen.jsx';
import RegisterCodeScreen from './screens/RegisterCodeScreen.jsx';
import WelcomeBackScreen from './screens/WelcomeBackScreen.jsx';
import AboutScreen from './screens/AboutScreen.jsx';
import QuestionnaireScreen from './screens/QuestionnaireScreen.jsx';
import SummaryScreen from './screens/SummaryScreen.jsx';
import IntroScreen from './screens/IntroScreen.jsx';
import RoundScreen from './screens/RoundScreen.jsx';
import CompleteScreen from './screens/CompleteScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import PracticalScreen from './screens/PracticalScreen.jsx';
import AdminScreen from './screens/AdminScreen.jsx';

// Ablauf „Profil erstellen“: Begrüssung → Registrierung (Vorname, Handynummer, SMS-Code) → Über dich →
// Fragebogen (Stufe 0) → Zusammenfassung → höchstens vier Runden mit Abschluss (Tutorial vor Runde 1 nur mit
// TUTORIAL_ENABLED). Die Karten wählt src/logic/selection.js je nach Antwort; die Kontrollkarten
// (Messkonzept, docs/messkonzept.md) kommen am Ende von Runde 2. Runde 3 enthält konkrete Lebensmittel,
// Runde 4 Gerichte. Freiwillig danach: Alltagsprofil (nurec v0.2, Kap. 2.3).
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
  // Echte SMS über Firebase, wenn eingerichtet (config.sms), sonst SIMULATION (auth/MockAuthService.js)
  const realSms = initial.config.sms === 'firebase';
  const auth = useMemo(() => createAuthService({ mode: initial.config.sms }), [initial.config.sms]);
  const [sms, setSms] = useState(null);
  const [state, dispatch] = useReducer(MODEL.reducer, initial, ({ config, account, saved }) => MODEL.initialState(config, { account, saved }));
  const { screen, tab, config, account, person, registration, answers, step, editing, onboarding, events, roundNumber, roundMode, dishRound, endedEarly } = state;
  // Laufende Runde (Profilerstellung oder Gerichte) und die Profilerstellung selbst (für Dashboard und „Weiter mit Runde N“)
  const round = useMemo(() => (onboarding ? MODEL.roundOf(state) : null), [onboarding, events, roundNumber, roundMode, dishRound]); // eslint-disable-line react-hooks/exhaustive-deps
  const mainRound = useMemo(() => (onboarding ? MODEL.mainRoundOf(state) : null), [onboarding, events, roundNumber]); // eslint-disable-line react-hooks/exhaustive-deps
  const practical = useMemo(() => practicalOf(events), [events]);
  const progress = useMemo(() => (mainRound ? profileProgress(mainRound) : null), [mainRound]);
  const moreRounds = Boolean(mainRound) && hasMoreCards(mainRound, config);
  const navVisible = isNavVisible(state);
  const steps = creationSteps(state, round);
  // Bilder zeigen nie, was die Person ausgeschlossen hat (siehe allowedPhotos in lib/images.js).
  const imageFilter = useMemo(() => (round ? { index: INDEX, exclusions: round.exclusions } : null), [round]);
  const firstName = account?.firstName ?? '';

  useEffect(() => auth.onSimulatedSms?.((message) => setSms({ code: message.code, key: message.sentAt })), [auth]);
  const dismissSms = useCallback(() => setSms(null), []);

  useEffect(() => {
    logger.trace('screen', screen === SCREENS.QUESTIONS ? { screen, step, tab } : { screen, tab });
    window.scrollTo(0, 0);
  }, [screen, step, tab, logger]);

  // Stand nur lokal speichern, sobald es etwas zum Weitermachen gibt (nie die volle Telefonnummer).
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
    logger.finish({ ...buildProfile(mainRound), progress, practical });
    // Nur beim Wechsel auf den Abschluss protokollieren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ---------- Ereignisse ----------

  // Ereignis ohne Antwort beim Wischen (Registrierung, Profil): ins Protokoll und ins Event-Log.
  function log(event) {
    dispatch({ type: 'log', event: logger.recordEvent({ timestamp: new Date().toISOString(), ...event }) });
  }

  // Profiländerung: immer source "profile". Die ursprüngliche Antwort beim Wischen bleibt unverändert.
  function profileChange(event) {
    log({ ...event, source: SOURCE_PROFILE });
  }

  const profileHandlers = {
    rating: (cardId, rating, previousRating) => profileChange({ type: RATING_CHANGED, cardId, rating, previousRating: previousRating ?? null }),
    // Vermutung der App direkt bewertet: wird zur direkten Bewertung; die Vermutung vorher bleibt im Log.
    confirmPrediction: (cardId, rating, predictedScore) =>
      profileChange({ type: RATING_CHANGED, cardId, rating, previousRating: null, fromPrediction: true, predictedScore }),
    addExclusions: (section, exclusions) => exclusions.length && profileChange({ type: EXCLUSION_ADDED, section, exclusions }),
    removeExclusions: (section, exclusions) => exclusions.length && profileChange({ type: EXCLUSION_REMOVED, section, exclusions }),
    diet: (diet, previousDiet) => profileChange({ type: DIET_CHANGED, diet, previousDiet }),
  };

  // Das protokollierte Profil folgt Änderungen in „Mein Profil“ (nach Ende der Runde).
  useEffect(() => {
    if (mainRound && logger.session.endedAt) logger.updateProfile({ ...buildProfile(mainRound), progress, practical });
  }, [mainRound, logger, progress, practical]);

  // ---------- Registrierung (simuliert) ----------

  function handleStart() {
    log({ type: AUTH_STARTED });
    dispatch({ type: 'go', screen: SCREENS.REGISTER_NAME });
  }

  async function handleSendCode(e164) {
    const request = await auth.sendCode(e164);
    dispatch({ type: 'codeSent', request: { ...request, e164 } });
  }

  async function handleResend() {
    const request = await auth.sendCode(registration.e164);
    dispatch({ type: 'registration', changes: request });
    return request;
  }

  async function handleVerify(code) {
    const result = await auth.verifyCode(registration.requestId, code);
    if (!result.ok) return result;
    // Nach der Bestätigung nur noch die gekürzte Nummer behalten.
    const nextAccount = { firstName: registration.firstName.trim(), phoneMasked: maskPhone(registration.e164), verifiedAt: new Date().toISOString() };
    saveAccount(nextAccount);
    log({ type: AUTH_COMPLETED, method: realSms ? 'sms' : 'sms-simulated' });
    setSms(null);
    dispatch({ type: 'verified', account: nextAccount });
    return result;
  }

  // ---------- Onboarding und Runde ----------

  // Für die Auswertung: Teilnehmer-Nr. und Altersgruppe. Vorname und Telefonnummer nie.
  function handleAbout({ person: nextPerson, firstName: givenName }) {
    logger.start({ participantCode: nextPerson.participantCode, ageGroup: nextPerson.ageGroup });
    logger.trace('about', { consent: true, nameGiven: Boolean(givenName || firstName) });
    if (givenName) saveAccount({ ...(account ?? {}), firstName: givenName });
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

  // „Runde beenden“: Die Karte, die gerade zu sehen war, als Abbruch protokollieren (nurec v0.2, Kap. 6).
  function handleEndRound() {
    const card = nextCard(round, config);
    if (card) {
      log({
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

  // Alltagsprofil (Kap. 2.3, freiwillig)
  function handleOpenPractical() {
    logger.trace('practical_open', { from: screen, tab });
    dispatch({ type: 'openPractical' });
  }

  function handleSavePractical(next) {
    log({ type: PRACTICAL_SAVED, source: 'practical', practical: next });
    dispatch({ type: 'closePractical' });
  }

  // Nächster sinnvoller Schritt für „Mein Profil“ (Anhang B1)
  function nextStep() {
    if (!mainRound) return null;
    if (screen !== SCREENS.COMPLETE) return { type: 'continue' };
    if (moreRounds) return { type: 'round', number: nextRoundNumber(mainRound, config), titles: nextRoundCards(mainRound, config).slice(0, 3).map((card) => displayCardTitle(card, INDEX, mainRound.exclusions)) };
    if (practicalAnswered(practicalDefinition, practical) === 0) return { type: 'practical' };
    return { type: 'done' };
  }

  function handleNextStep(next) {
    if (next.type === 'round') {
      handleTab(TABS.CREATE);
      handleNextRound();
    } else if (next.type === 'practical') handleOpenPractical();
    else handleTab(TABS.CREATE);
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

  // Abmelden: Konto und Stand auf diesem Gerät löschen. Die Sitzung für die Auswertung bleibt (ohne Namen).
  function handleSignOut() {
    logger.trace('sign_out');
    signOutLocally();
    setSms(null);
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
            onNext={(value) => {
              dispatch({ type: 'registration', changes: { firstName: value } });
              dispatch({ type: 'go', screen: SCREENS.REGISTER_PHONE });
            }}
            onBack={() => dispatch({ type: 'go', screen: SCREENS.START })}
          />
        );
      case SCREENS.REGISTER_PHONE:
        return (
          <RegisterPhoneScreen
            country={registration.country}
            phoneInput={registration.phoneInput}
            onChange={(changes) => dispatch({ type: 'registration', changes })}
            onSend={handleSendCode}
            onBack={() => dispatch({ type: 'go', screen: SCREENS.REGISTER_NAME })}
            realSms={realSms}
          />
        );
      case SCREENS.REGISTER_CODE:
        return (
          <RegisterCodeScreen
            phoneDisplay={`${countryById(registration.country).dial} ${formatPhoneInput(registration.phoneInput, countryById(registration.country)).replace(/^0/, '')}`}
            request={registration}
            onVerify={handleVerify}
            onResend={handleResend}
            onBack={() => dispatch({ type: 'go', screen: SCREENS.REGISTER_PHONE })}
            realSms={realSms}
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
          />
        );
      case SCREENS.PRACTICAL:
        return (
          <PracticalScreen
            definition={practicalDefinition}
            initial={practical}
            onSave={handleSavePractical}
            onCancel={() => dispatch({ type: 'closePractical' })}
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
            practicalDone={practicalAnswered(practicalDefinition, practical) > 0}
            onNextRound={handleNextRound}
            onOpenPractical={handleOpenPractical}
            onToProfile={() => handleTab(TABS.PROFILE)}
          />
        );
    }
  }

  return (
    <ImageStyleContext.Provider value={config.imageStyle}>
      <ImageFilterContext.Provider value={imageFilter}>
        <div className="app" data-nav={navVisible ? '' : undefined}>
          {sms && <SmsBanner key={sms.key} code={sms.code} onDismiss={dismissSms} />}
          {tab === TABS.PROFILE && navVisible ? (
            <ProfileScreen
              round={mainRound}
              onboarding={onboarding}
              account={account}
              index={INDEX}
              allergens={allergens}
              foods={FOODS}
              dietOptions={STAGE0_FOR_PROFILE}
              steps={steps}
              next={nextStep()}
              practical={practical}
              practicalDefinition={practicalDefinition}
              canSignOut={Boolean(account?.phoneMasked)}
              onCreate={() => handleTab(TABS.CREATE)}
              onNext={handleNextStep}
              onOpenPractical={handleOpenPractical}
              onRestart={handleRestart}
              onSignOut={handleSignOut}
              onChange={profileHandlers}
            />
          ) : (
            renderCreate()
          )}
          {navVisible && <BottomNav active={tab} onSelect={handleTab} />}
          {/* Platz für das unsichtbare reCAPTCHA von Firebase (nur bei echter SMS) */}
          {realSms && <div id={RECAPTCHA_CONTAINER_ID} />}
        </div>
      </ImageFilterContext.Provider>
    </ImageStyleContext.Provider>
  );
}
