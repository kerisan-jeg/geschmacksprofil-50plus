// Simulierte Testpersonen für Tests der Kartenauswahl und der Auswertung. Keine echten Daten.
// Spielt eine ganze Sitzung durch, wie die App sie protokolliert: Kontrollkarten ziehen (HOLDOUT_DRAWN),
// dann Runde für Runde die nächste Karte beantworten, bis keine Runde mehr möglich ist.

import { MAX_ROUNDS } from '../config.js';
import { INTOLERANT } from '../logic/answers.js';
import { deriveRoundState, hasMoreCards, isHoldoutCard, selectNextCards, selectionReason } from '../logic/engine.js';
import { ANSWER, HOLDOUT_DRAWN, PHASE_HOLDOUT, PHASE_MAIN } from '../logic/events.js';
import { drawHoldout } from '../logic/holdout.js';

export const NO_ONBOARDING = { diet: null, exclusions: [], cardLabels: {} };

// respond(card) liefert die Antwort (z. B. LIKE) für jede gezeigte Karte.
export function simulateSession({ index, diets, config, respond, sessionId = 'sim-1', participantCode = null, onboarding = NO_ONBOARDING }) {
  const events = [];
  const at = (round) => deriveRoundState({ index, onboarding, diets, events, round });
  const holdout = drawHoldout(at(1), { count: config.holdout ?? 0, seed: sessionId });
  if (holdout.cardIds.length > 0) events.push({ type: HOLDOUT_DRAWN, sessionId, ...holdout });
  let clock = Date.parse('2026-10-15T09:00:00.000Z');
  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    for (let position = 1; ; position += 1) {
      const state = at(round);
      const card = selectNextCards(state, config)[0];
      if (!card) break;
      const response = respond(card);
      clock += 4000;
      events.push({
        type: ANSWER,
        sessionId,
        cardId: card.id,
        stage: card.stage,
        parentId: card.parentId,
        round,
        positionInRound: position,
        phase: isHoldoutCard(state, card.id) ? PHASE_HOLDOUT : PHASE_MAIN,
        response,
        timestamp: new Date(clock).toISOString(),
        responseTimeMs: 2500,
        inputMethod: 'button',
        selectionReason: selectionReason(state, card, config),
        ...(response === INTOLERANT ? { excludedCardIds: [card.id] } : {}),
      });
    }
    if (!hasMoreCards(at(round), config)) break;
  }
  return {
    sessionId,
    participantCode,
    startedAt: '2026-10-15T09:00:00.000Z',
    endedAt: new Date(clock).toISOString(),
    config,
    onboarding: { ageGroup: '60-69', diet: onboarding.diet, exclusions: onboarding.exclusions },
    events,
  };
}

// Antwort nach Gruppe: Jede Karte bekommt die Antwort ihrer Gruppe (Familie), ausser es gibt eine eigene.
export function tasteByFamily(index, byFamily, own = {}) {
  return (card) => {
    if (own[card.id]) return own[card.id];
    let family = card;
    while (family.parentId) family = index.get(family.parentId);
    return byFamily[family.id];
  };
}
