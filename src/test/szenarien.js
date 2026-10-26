// Nachvollziehbare Beispielszenarien für die Dokumentation (docs/02_Kartenauswahl_und_Swipe_Logik.md, Abschnitt
// „Ablaufbeispiele“) und für die Tests (src/logic/studienszenarien.test.js). Keine echten Daten.
//
// play() spielt eine Sitzung genau so durch, wie die App sie protokolliert: Onboarding ableiten, Kontrollkarten
// ziehen (HOLDOUT_DRAWN), dann Runde für Runde immer die erste Karte aus selectNextCards() beantworten.
// respond(card) liefert die Antwort je Karte; alles ist deterministisch (Zufall nur aus der sessionId).
// scripts/ablauf-beispiele.mjs druckt dieselben Abläufe als Tabelle.

import { cardLimit, MAX_ROUNDS, normalizeConfig } from '../config.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { buildProfile, deriveRoundState, derivedEntries, hasMoreCards, isHoldoutCard, presentCard, selectionReason, selectNextCards } from '../logic/engine.js';
import { ANSWER, HOLDOUT_DRAWN, PHASE_DISH, PHASE_HOLDOUT, PHASE_MAIN } from '../logic/events.js';
import { drawHoldout } from '../logic/holdout.js';
import { deriveOnboarding, emptyAnswers } from '../logic/stage0.js';
import { buildDashboard, profileProgress } from '../logic/dashboard.js';

// Antworten aus Stufe 0 in der Form, wie der Fragebogen sie speichert (src/logic/stage0.js, emptyAnswers).
//   form            Ernährungsform (none, pescetarian, vegetarian, vegan)
//   dietExclusions  Einzelausschlüsse aus Frage 1, Teil B (animalOrigin:pork, food:Alkohol, …)
//   rules           Speisevorschriften aus Frage 1, Teil C (halal, kosher), ohne eigene Wirkung
//   allergenIds     Frage 2, granulare Allergen-IDs (lactose, hazelnut, wheat, …)
//   items           Frage 2, Lebensmittel aus der Suche (card:F05.3, food:Tomate)
//   notes           Frage 2, eingetippte Notizen
//   neverKeys       Frage 3, Schnellauswahl und Suche (animalOrigin:seafood, card:F05.4, food:Alkohol)
export function onboardingAnswers(stage0, { form = 'none', dietExclusions = [], rules = [], allergenIds = [], items = [], notes = [], neverKeys = [], neverNotes = [] } = {}) {
  const empty = emptyAnswers(stage0.questions);
  const anyIntolerance = allergenIds.length + items.length + notes.length > 0;
  const anyNever = neverKeys.length + neverNotes.length > 0;
  return {
    ...empty,
    diet: { form, exclusions: [...dietExclusions], rules: [...rules] },
    intolerances: anyIntolerance ? { ...empty.intolerances, gate: 'yes', selected: [...allergenIds], items: [...items], notes: [...notes] } : { ...empty.intolerances, gate: 'no' },
    never: anyNever ? { ...empty.never, gate: 'yes', selected: [...neverKeys], notes: [...neverNotes] } : { ...empty.never, gate: 'no' },
  };
}

export function onboardingFor({ stage0, allergens, index }, spec = {}) {
  return deriveOnboarding(stage0, onboardingAnswers(stage0, spec), { allergens, catalogIndex: index });
}

// Antwort je Karten-ID, sonst die Rückfallantwort (Funktion oder fester Wert).
export function respondById(map, fallback = LIKE) {
  return (card) => {
    const own = map[card.id];
    if (own) return typeof own === 'string' ? { response: own } : own;
    return { response: typeof fallback === 'function' ? fallback(card) : fallback };
  };
}

// Spielt eine Sitzung durch. Liefert je Runde die gezeigten Karten mit Grund, Phase und Antwort sowie den Endzustand.
export function play({ index, stage0, allergens, cuisines = [], onboarding, respond, sessionId, config: rawConfig = {} }) {
  const config = normalizeConfig(rawConfig);
  const events = [];
  const at = (round) => deriveRoundState({ index, onboarding, diets: stage0.diets, events, round });
  const holdout = drawHoldout(at(1), { count: Math.min(config.holdout ?? 0, cardLimit(config)), seed: sessionId });
  if (holdout.cardIds.length > 0) events.push({ type: HOLDOUT_DRAWN, cardIds: holdout.cardIds, method: holdout.method, eligible: holdout.eligible });
  const rounds = [];
  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    const shown = [];
    for (let position = 1; ; position += 1) {
      const state = at(round);
      const card = selectNextCards(state, config)[0];
      if (!card) break;
      const { response, excludedCardIds } = respond(card, state);
      const phase = card.stage === 4 ? PHASE_DISH : isHoldoutCard(state, card.id) ? PHASE_HOLDOUT : PHASE_MAIN;
      const presented = presentCard(state, card);
      shown.push({ id: card.id, title: presented.title, notes: presented.notes ?? [], reason: selectionReason(state, card, config), phase, response, excludedCardIds: excludedCardIds ?? null });
      events.push({
        type: ANSWER,
        cardId: card.id,
        stage: card.stage,
        parentId: card.parentId,
        round,
        positionInRound: position,
        phase,
        response,
        ...(excludedCardIds ? { excludedCardIds } : {}),
      });
    }
    rounds.push({ round, cards: shown });
    if (!hasMoreCards(at(round), config)) break;
  }
  const final = at(MAX_ROUNDS);
  return {
    sessionId,
    config,
    holdout: holdout.cardIds,
    rounds,
    events,
    final,
    profile: buildProfile(final),
    progress: profileProgress(final),
    dashboard: buildDashboard(final, { cuisines }),
    derived: derivedEntries(final),
  };
}

// Die drei Beispielszenarien der Dokumentation. Nur Lebensmittel und Gerichte aus dem Katalog.
export const SZENARIEN = [
  {
    id: 'A',
    name: 'Marianne, 68, keine Einschränkungen',
    sessionId: 'szenario-a',
    beschreibung: 'Mag fast alles, Obst besonders. Hülsenfrüchte und Nüsse eher ungern, Fisch und Meeresfrüchte kennt sie kaum.',
    onboarding: {},
    respond: respondById({
      F02: UNFAMILIAR, F05: DISLIKE, F12: PREFER, F13: DISLIKE,
      'F02.1': LIKE, 'F05.4': LIKE, 'F12.1': PREFER, 'F12.4': DISLIKE, 'F13.2': LIKE,
      'F05.4.1': PREFER, 'F12.1.1': PREFER, 'F12.4.1': DISLIKE,
      D01: PREFER, D05: LIKE, D11: UNFAMILIAR,
    }, LIKE),
  },
  {
    id: 'B',
    name: 'Peter, 74, vegetarisch und laktoseintolerant',
    sessionId: 'szenario-b',
    beschreibung: 'Vegetarisch, Laktose in Frage 2. Mag fast alles, Rohkost eher ungern, gegartes Gemüse sehr gern. Gerichte kennt er oft nicht.',
    onboarding: { form: 'vegetarian', allergenIds: ['lactose'] },
    respond: respondById({ F10: DISLIKE, F11: PREFER, 'F10.2': LIKE, 'F11.1': PREFER, 'F11.3': LIKE, D15: LIKE, D22: PREFER }, (card) => (card.stage === 4 ? UNFAMILIAR : LIKE)),
  },
  {
    id: 'C',
    name: 'Ruth, 59, Haselnussallergie, überwiegend ungern',
    sessionId: 'szenario-c',
    beschreibung: 'Haselnuss in Frage 2. Beim Wischen „Vertrage ich nicht“ bei Eiern. Mag Brot, Kartoffeln und Käse, sonst fast alles eher ungern.',
    onboarding: { allergenIds: ['hazelnut'] },
    respond: (card) => {
      if (card.id === 'F03') return { response: INTOLERANT, excludedCardIds: ['F03'] };
      if (['F06', 'F09', 'F04.2', 'F06.1'].includes(card.id)) return { response: LIKE };
      if (card.stage === 4) return { response: card.id === 'D04' ? LIKE : DISLIKE };
      return { response: DISLIKE };
    },
  },
];

export function playScenario(scenario, data, config = {}) {
  return play({ ...data, onboarding: onboardingFor(data, scenario.onboarding), respond: scenario.respond, sessionId: scenario.sessionId, config });
}
