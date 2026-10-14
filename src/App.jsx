import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import catalog from './data/catalog.json';
import stage0 from './data/stage0.json';
import allergens from './data/allergens.json';
import { isAdminMode, resolveConfig } from './config.js';
import { ImageStyleContext } from './lib/images.js';
import { indexCatalog } from './logic/catalog.js';
import { UNDO } from './logic/answers.js';
import { buildProfile, eligibleFamilies, RULE_VERSION, selectionReason } from './logic/engine.js';
import { ANSWER, AUTH_COMPLETED, AUTH_STARTED, DIET_CHANGED, EXCLUSION_ADDED, EXCLUSION_REMOVED, RATING_CHANGED, SOURCE_PROFILE } from './logic/events.js';
import { createRedundancyCheck } from './logic/stage0.js';
import { summarySections } from './logic/profile.js';
import { createLogger, storageAvailable } from './logging/logger.js';
import { createAppModel, creationSteps, hasProgress, isNavVisible, SCREENS, TABS } from './app/model.js';
import { createAuthService } from './auth/AuthService.js';
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
import AdminScreen from './screens/AdminScreen.jsx';

// Ablauf „Profil erstellen“: Begrüssung → Registrierung (Vorname, Handynummer, SMS-Code) → Über dich →
// Fragebogen (Stufe 0) → Zusammenfassung → Runde → Abschluss (Tutorial vor der Runde nur mit TUTORIAL_ENABLED).
// Daneben „Mein Profil“ als zweiter Bereich der unteren Navigation. Zustandswechsel: app/model.js.
const INDEX = indexCatalog(catalog.cards);
const FOODS = catalog.foods ?? [];
const STAGE0_FOR_PROFILE = {
  options: stage0.questions.find((question) => question.id === 'diet')?.options ?? [],
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
  const config = saved?.state?.config ?? CONFIG;
  return { saved, account, config };
}

function App() {
  const [initial] = useState(boot);
  // Ein Protokoll pro Testperson; nach einem Neuladen geht dieselbe Sitzung weiter.
  const [logger, setLogger] = useState(() =>
    createLogger(initial.config, { resumeSessionId: initial.saved?.sessionId ?? null, seedEvents: initial.saved?.state?.events ?? [] })
  );
  const [storageOk] = useState(() => storageAvailable());
  // SIMULATION: kein echter SMS-Versand, siehe auth/MockAuthService.js
  const auth = useMemo(() => createAuthService(), []);
  const [sms, setSms] = useState(null);
  const [state, dispatch] = useReducer(MODEL.reducer, initial, ({ config, account, saved }) => MODEL.initialState(config, { account, saved }));
  const { screen, tab, config, account, person, registration, answers, step, editing, onboarding, events, endedEarly } = state;
  const round = useMemo(() => (onboarding ? MODEL.roundOf(state) : null), [onboarding, events]); // eslint-disable-line react-hooks/exhaustive-deps
  const navVisible = isNavVisible(state);
  const steps = creationSteps(state, round);
  const firstName = account?.firstName ?? '';

  useEffect(() => auth.onSimulatedSms((message) => setSms({ code: message.code, key: message.sentAt })), [auth]);
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
    addExclusions: (section, exclusions) => exclusions.length && profileChange({ type: EXCLUSION_ADDED, section, exclusions }),
    removeExclusions: (section, exclusions) => exclusions.length && profileChange({ type: EXCLUSION_REMOVED, section, exclusions }),
    diet: (diet, previousDiet) => profileChange({ type: DIET_CHANGED, diet, previousDiet }),
  };

  // Das protokollierte Profil folgt Änderungen in „Mein Profil“ (nach Ende der Runde).
  useEffect(() => {
    if (round && logger.session.endedAt) logger.updateProfile(buildProfile(round));
  }, [round, logger]);

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
    log({ type: AUTH_COMPLETED, method: 'sms-simulated' });
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
  function handleConfirmSummary() {
    logger.trace('stage0_confirm', { eligible: eligibleFamilies(round).map((card) => card.id) });
    dispatch({ type: 'confirmSummary' });
  }

  function handleEditAnswers(questionId) {
    logger.trace('stage0_edit', { question: questionId });
    dispatch({ type: 'editAnswers', step: stage0.questions.findIndex((question) => question.id === questionId) });
  }

  function handleStartRound() {
    dispatch({ type: 'startRound' });
  }

  // Ein Antwort-Ereignis: genau dieses Objekt geht ins Protokoll und in den Zustand.
  function record(card, response, extra) {
    const event = {
      type: ANSWER,
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
      source: 'swipe',
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
            sections={summarySections(round, { onboarding, diets: stage0.diets, allergens, index: INDEX })}
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
            onEndRound={() => dispatch({ type: 'end' })}
          />
        );
      default:
        return (
          <CompleteScreen
            round={round}
            endedEarly={endedEarly}
            firstName={firstName}
            ruleCount={round.entries.filter((entry) => !entry.freeText).length + (round.diet && round.diet !== 'none' ? 1 : 0)}
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
            account={account}
            index={INDEX}
            allergens={allergens}
            foods={FOODS}
            dietOptions={STAGE0_FOR_PROFILE}
            steps={steps}
            canSignOut={Boolean(account?.phoneMasked)}
            onCreate={() => handleTab(TABS.CREATE)}
            onRestart={handleRestart}
            onSignOut={handleSignOut}
            onChange={profileHandlers}
          />
        ) : (
          renderCreate()
        )}
        {navVisible && <BottomNav active={tab} onSelect={handleTab} />}
        {sms && <SmsBanner key={sms.key} code={sms.code} onDismiss={dismissSms} />}
      </div>
    </ImageStyleContext.Provider>
  );
}
