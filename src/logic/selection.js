// Kartenauswahl: welche Karte als Nächstes sinnvoll ist. Reine Funktionen (kein Zufall, keine Uhrzeit).
//
// 'adaptive' (Standard ab Version 0.7) setzt die Regeln aus nurec v0.2 um (Kap. 4 und 6, Spalte laterUse in
// answers.js) [D], geordnet in Stufen mit fester Rangfolge [V]. Innerhalb einer Stufe wechseln sich die
// Gruppen ab, damit nicht mehrere Karten derselben Gruppe hintereinander kommen.
//
//   Rang  selectionReason            Karten
//   1     stage2_after_unfamiliar    „Kenne ich nicht“ bei einer Gruppe: sofort ein Kind derselben Gruppe,
//                                    höchstens zwei, bis eines bewertet ist
//   2     stage1_family              Gruppen (Stufe 1), die noch nicht gefragt wurden
//   3     stage2_favorite            Gruppe „Mag ich sehr“: alle Untergruppen (Favoriten finden)
//   4     stage3_favorite            Untergruppe „Mag ich sehr“: ihre Sorten (z. B. Käse → Hartkäse)
//   5     stage2_exception           Gruppe „Mag ich nicht“: eine plausible Ausnahme nachtesten (erste Untergruppe)
//   6     stage2_differentiate       Gruppe „Mag ich“: Untergruppen unterscheiden
//         stage2_after_exception     „Mag ich nicht“, aber die Ausnahme gefällt: die übrigen Untergruppen
//         stage2_after_intolerant    „Vertrage ich nicht“ nur für einen Teil: höchstens zwei der übrigen Kinder
//   7     stage3_detail              Untergruppe „Mag ich“: ihre Sorten
//
// Was keine Regel trifft, wird nicht gefragt, sondern vermutet (preferences.js), z. B. die übrigen Untergruppen
// einer Gruppe „Mag ich nicht“ ohne Ausnahme. So bleibt die Zahl der Karten klein (Kernfrage 2 [A]).
// Massgebend ist die aktuelle direkte Bewertung (beim Wischen oder später im Profil).
// Harte Ausschlüsse wirken immer (isVisible). Kontrollkarten (state.holdout) kommen hier nie vor; engine.js
// hängt sie am Ende der letzten Runde an.
//
// 'fixed': feste Reihenfolge wie in Version 0.6 (alle Gruppen, dann die Untergruppen abwechselnd, ohne Stufe 3),
// als Vergleich im Pilot (?selection=fixed).

import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR, isTasteSignal } from './answers.js';
import { isVisible } from './filter.js';

export const SELECTION = { ADAPTIVE: 'adaptive', FIXED: 'fixed' };

// nurec v0.2, laterUse in answers.js: „höchstens zwei“ Kinder nach „Kenne ich nicht“, „eine“ Ausnahme nach „Mag ich nicht“
export const UNKNOWN_CHILD_LIMIT = 2;
export const EXCEPTION_TESTS = 1;

export const REASONS = {
  FIXED_STAGE1: 'stage1_fixed_order',
  FIXED_STAGE2: 'stage2_fixed_order',
  AFTER_UNFAMILIAR: 'stage2_after_unfamiliar',
  FAMILY: 'stage1_family',
  FAVORITE: 'stage2_favorite',
  FAVORITE_DETAIL: 'stage3_favorite',
  EXCEPTION: 'stage2_exception',
  DIFFERENTIATE: 'stage2_differentiate',
  AFTER_EXCEPTION: 'stage2_after_exception',
  AFTER_INTOLERANT: 'stage2_after_intolerant',
  DETAIL: 'stage3_detail',
  HOLDOUT: 'holdout_check',
};

const TIERS = ['unknown', 'family', 'favorite', 'favoriteDetail', 'exception', 'differentiate', 'detail'];
const LIKED = [LIKE, PREFER];

// Aktuelle direkte Bewertung: beim Wischen oder im Profil geändert (null = aus dem Profil entfernt).
export function currentRating(state, id) {
  if (state.ratings && id in state.ratings) return state.ratings[id];
  return state.answers?.[id] ?? null;
}

// Erledigt: beim Wischen beantwortet (jede Antwort) oder eine Vermutung im Profil direkt bewertet.
export function isDone(state, id) {
  if (id in (state.answers ?? {})) return true;
  return (state.profileRated ?? []).includes(id) && state.ratings?.[id] != null;
}

// Erst von jeder Liste das erste Element, dann das zweite …
function interleave(lists) {
  const out = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let position = 0; position < longest; position += 1) {
    for (const list of lists) if (list[position]) out.push(list[position]);
  }
  return out;
}

// Feste Reihenfolge (Version 0.6): zuerst die Gruppen in Katalogreihenfolge, dann die Untergruppen abwechselnd.
export function fixedOrder(index) {
  const families = index.cards.filter((card) => card.stage === 1);
  const children = families.map((family) => index.childrenOf(family.id).filter((card) => card.stage === 2));
  return [...families, ...interleave(children)];
}

// Alle noch offenen Karten in der Reihenfolge, in der sie gezeigt würden: [{ card, reason }].
export function rankedCards(state, mode = SELECTION.FIXED) {
  const { index, exclusions } = state;
  const holdout = new Set(state.holdout ?? []);
  const open = (card) => !isDone(state, card.id) && !holdout.has(card.id) && isVisible(card, index, exclusions);

  if (mode !== SELECTION.ADAPTIVE) {
    return fixedOrder(index)
      .filter(open)
      .map((card) => ({ card, reason: card.stage === 1 ? REASONS.FIXED_STAGE1 : REASONS.FIXED_STAGE2 }));
  }

  const tiers = Object.fromEntries(TIERS.map((tier) => [tier, []]));
  const add = (tier, cards, reason) => {
    if (cards.length > 0) tiers[tier].push(cards.map((card) => ({ card, reason })));
  };

  for (const family of index.cards.filter((card) => card.stage === 1)) {
    if (!isDone(state, family.id)) {
      if (open(family)) add('family', [family], REASONS.FAMILY);
      continue;
    }
    const children = index.childrenOf(family.id);
    const answered = children.filter((child) => isDone(state, child.id)).map((child) => currentRating(state, child.id));
    const waiting = children.filter(open);
    const likedChild = answered.some((rating) => LIKED.includes(rating));
    const tastedChild = answered.some(isTasteSignal);
    const stillUnknown = !tastedChild && answered.length < UNKNOWN_CHILD_LIMIT;
    switch (currentRating(state, family.id)) {
      case PREFER:
        add('favorite', waiting, REASONS.FAVORITE);
        break;
      case LIKE:
        add('differentiate', waiting, REASONS.DIFFERENTIATE);
        break;
      case DISLIKE:
        if (likedChild) add('differentiate', waiting, REASONS.AFTER_EXCEPTION);
        else if (answered.length < EXCEPTION_TESTS) add('exception', waiting.slice(0, EXCEPTION_TESTS), REASONS.EXCEPTION);
        break;
      case UNFAMILIAR:
        if (likedChild) add('differentiate', waiting, REASONS.DIFFERENTIATE);
        else if (stillUnknown) add('unknown', waiting.slice(0, UNKNOWN_CHILD_LIMIT - answered.length), REASONS.AFTER_UNFAMILIAR);
        break;
      case INTOLERANT:
        // Nur ein Teil ausgeschlossen (z. B. Haselnüsse): Den Geschmack für den Rest kennen wir noch nicht.
        if (likedChild) add('differentiate', waiting, REASONS.AFTER_INTOLERANT);
        else if (stillUnknown) add('differentiate', waiting.slice(0, UNKNOWN_CHILD_LIMIT - answered.length), REASONS.AFTER_INTOLERANT);
        break;
      default:
        break;
    }
  }

  for (const card of index.cards.filter((entry) => entry.stage === 2 && isDone(state, entry.id))) {
    const details = index.childrenOf(card.id).filter(open);
    const rating = currentRating(state, card.id);
    if (rating === PREFER) add('favoriteDetail', details, REASONS.FAVORITE_DETAIL);
    else if (rating === LIKE) add('detail', details, REASONS.DETAIL);
  }

  return TIERS.flatMap((tier) => interleave(tiers[tier]));
}
