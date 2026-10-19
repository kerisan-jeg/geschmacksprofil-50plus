// Kartenauswahl: welche Karte als Nächstes sinnvoll ist. Reine Funktionen (kein Zufall, keine Uhrzeit).
//
// 'adaptive' (Standard) setzt die Regeln aus nurec v0.2 um (Kap. 5, 6 und 11) [D]. Die Rangfolge der Stufen
// ist ein eigener Entscheid [V]. Innerhalb einer Stufe wechseln sich die Gruppen ab, damit nie mehrere Karten
// derselben Gruppe hintereinander kommen.
//
//   Rang  selectionReason            Karten
//   1     stage2_after_unfamiliar    „Kenne ich nicht“ bei einer Gruppe: sofort ein verbreitetes Kind, bei erneutem
//         stage3_after_unfamiliar    „Kenne ich nicht“ höchstens ein zweites, andersartiges (auch bei Untergruppen,
//                                    z. B. Fruchtgemüse → Zucchetti, dann Peperoni). Nur in derselben Runde:
//                                    Ist das Limit vorher erreicht, bleibt der Zweig unbekannt.
//   2     stage1_family              Gruppen (Stufe 1), die noch nicht gefragt wurden
//   3     stage2_exception           Gruppe „Mag ich nicht“: die plausible Ausnahme (exceptionCandidate im Katalog,
//                                    z. B. Hülsenfrüchte → Sojaprodukte, Fisch und Meeresfrüchte → Krebstiere)
//   4     stage2_contrast            Gruppe „Mag ich“ oder „Mag ich sehr“: zwei Untergruppen, an denen sich ein
//                                    Unterschied zeigt (contrastPair, z. B. Obst → Beeren und Zitrusfrüchte)
//   5     stage3_exception_detail    Ausnahme gefällt: konkrete Lebensmittel daraus (Sojaprodukte → Naturtofu, Tempeh)
//         stage3_difference          Kontrast unterschiedlich beantwortet: je ein konkretes Lebensmittel (Erdbeeren, Orangen)
//   6     stage3_favorite            Untergruppe „Mag ich sehr“: konkrete Favoriten (höchstens drei)
//   7     stage2_difference          Kontrast unterschiedlich: die übrigen Untergruppen dieser Gruppe
//         stage2_after_intolerant    „Vertrage ich nicht“ nur für einen Teil: höchstens zwei der übrigen Kinder
//   8     stage2_after_negative      Gruppe „Mag ich nicht“: die übrigen Untergruppen, ganz am Schluss
//         stage3_after_negative      (NEGATIVE_GROUP_POLICY 'last', Dozentenfeedback 19.10.2026): Eine negative
//                                    Gruppe ist kein Ausschluss; ihre Kinder kommen, wenn das Kartenlimit Platz lässt.
//
// Was keine Regel trifft, wird nicht gefragt, sondern vermutet (preferences.js): z. B. die übrigen Untergruppen,
// wenn der Kontrast gleich ausfällt, oder einer Gruppe „Mag ich nicht“ ohne Ausnahme. So bleibt die Zahl der
// Karten klein (Kernfrage 2 [A]; nurec: „Zusätzliche Stufen werden nur eröffnet, wenn sie einen neuen
// Geschmackshinweis versprechen“). Massgebend ist die aktuelle direkte Bewertung (beim Wischen oder im Profil).
// Harte Ausschlüsse wirken immer (isVisible). Kontrollkarten (state.holdout) kommen hier nie vor; engine.js hängt
// sie am Ende von Runde 2 an. rankedStageCards begrenzt die Regeln auf die Ebene der aktuellen Runde;
// Gerichte bilden ausschliesslich Runde 4 (engine.js).
//
// 'fixed': feste Reihenfolge als Vergleich im Pilot, ebenfalls eine Ebene je Runde (inklusive Stufe 3).

import { NEGATIVE_GROUP_POLICY } from '../config.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR, isTasteSignal } from './answers.js';
import { isVisible } from './filter.js';

export const SELECTION = { ADAPTIVE: 'adaptive', FIXED: 'fixed' };

// nurec v0.2, Kap. 6: höchstens zwei Klärungskarten nach „Kenne ich nicht“, höchstens eine Ausnahme nach „Mag ich nicht“.
export const UNKNOWN_CHILD_LIMIT = 2;
export const EXCEPTION_TESTS = 1;
// Annahmen [V]: konkrete Lebensmittel nach einer gefundenen Ausnahme (Kap. 11: „Naturtofu oder Tempeh“) und Favoriten.
export const EXCEPTION_DETAIL_LIMIT = 2;
export const FAVORITE_LIMIT = 3;

export const REASONS = {
  FIXED_STAGE1: 'stage1_fixed_order',
  FIXED_STAGE2: 'stage2_fixed_order',
  FIXED_STAGE3: 'stage3_fixed_order',
  DETAIL: 'stage3_detail',
  AFTER_UNFAMILIAR: 'stage2_after_unfamiliar',
  AFTER_UNFAMILIAR_DETAIL: 'stage3_after_unfamiliar',
  FAMILY: 'stage1_family',
  EXCEPTION: 'stage2_exception',
  CONTRAST: 'stage2_contrast',
  EXCEPTION_DETAIL: 'stage3_exception_detail',
  DIFFERENCE_DETAIL: 'stage3_difference',
  FAVORITE_DETAIL: 'stage3_favorite',
  DIFFERENCE: 'stage2_difference',
  AFTER_INTOLERANT: 'stage2_after_intolerant',
  AFTER_NEGATIVE: 'stage2_after_negative',
  AFTER_NEGATIVE_DETAIL: 'stage3_after_negative',
  HOLDOUT: 'holdout_check',
  DISH: 'stage4_dish',
};

const TIERS = ['clarify', 'family', 'exception', 'contrast', 'precise', 'favorite', 'difference', 'negative'];
const NEGATIVE_LAST = NEGATIVE_GROUP_POLICY === 'last';
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

// Kann die Karte gefragt werden? Sichtbar nach den Ausschlüssen und keine Kontrollkarte.
export function isUsable(state, card) {
  return !(state.holdout ?? []).includes(card.id) && isVisible(card, state.index, state.exclusions);
}

// Bevorzugte Kinder zuerst (z. B. contrastPair), ersetzt durch das nächste Kind, wenn eines nicht in Frage kommt
// (Kontrollkarte, ausgeschlossen). Liefert die nutzbaren Kinder in dieser Reihenfolge.
export function usableChildren(state, card, preferred = []) {
  const children = state.index.childrenOf(card.id);
  const first = preferred.map((id) => state.index.get(id)).filter((child) => child && children.includes(child));
  return [...first, ...children.filter((child) => !first.includes(child))].filter((child) => isUsable(state, child));
}

// Die Karten, die einen Zweig auf Stufe 2 klären (nurec v0.2, Kap. 6): bei „Mag ich nicht“ die Ausnahme, bei
// „Mag ich“ und „Mag ich sehr“ das Kontrastpaar. Für den Profilstand (dashboard.js) und die Auswahl.
export function branchCards(state, family) {
  const rating = currentRating(state, family.id);
  if (rating === DISLIKE) return usableChildren(state, family, [family.exceptionCandidate].filter(Boolean)).slice(0, EXCEPTION_TESTS);
  if (rating === LIKE || rating === PREFER) return usableChildren(state, family, family.contrastPair ?? []).slice(0, 2);
  return [];
}

// Alle noch offenen Karten in der Reihenfolge, in der sie gezeigt würden: [{ card, reason }].
export function rankedCards(state, mode = SELECTION.FIXED, { stage = null } = {}) {
  const { index } = state;
  const usable = (card) => isUsable(state, card);
  const open = (card) => usable(card) && !isDone(state, card.id);

  if (mode !== SELECTION.ADAPTIVE) {
    return fixedOrder(index)
      .filter(open)
      .map((card) => ({ card, reason: card.stage === 1 ? REASONS.FIXED_STAGE1 : REASONS.FIXED_STAGE2 }));
  }

  const tiers = Object.fromEntries(TIERS.map((tier) => [tier, []]));
  const add = (tier, cards, reason) => {
    if (cards.length > 0) tiers[tier].push(cards.map((card) => ({ card, reason })));
  };
  const rating = (card) => currentRating(state, card.id);
  const answeredIn = (id) => state.answeredInRound?.[id];

  const candidates = (card, preferred = []) => usableChildren(state, card, preferred);

  // „Kenne ich nicht“: höchstens zwei Klärungskarten, nur solange die Runde dieselbe ist.
  const clarify = (card, reason) => {
    const children = candidates(card);
    const answered = children.filter((child) => isDone(state, child.id));
    if (answered.some((child) => isTasteSignal(rating(child))) || answered.length >= UNKNOWN_CHILD_LIMIT) return;
    // Die jüngste Antwort in diesem Zweig muss aus der laufenden Runde stammen.
    const latest = [card, ...answered].reduce((best, entry) => ((state.answeredAt?.[entry.id] ?? -1) > (state.answeredAt?.[best.id] ?? -1) ? entry : best));
    // Im gestuften Ablauf beginnt die Klärung auf der nächsten Ebene. Nach der ersten
    // Klärungskarte bleibt die Begrenzung auf zwei Karten innerhalb dieser Runde bestehen.
    if (answeredIn(latest.id) !== state.round && !(stage === card.stage + 1 && latest.id === card.id)) return;
    add('clarify', children.filter(open).slice(0, UNKNOWN_CHILD_LIMIT - answered.length), reason);
  };

  for (const family of index.cards.filter((card) => card.stage === 1)) {
    if (!isDone(state, family.id)) {
      if (open(family)) add('family', [family], REASONS.FAMILY);
      continue;
    }
    switch (rating(family)) {
      case DISLIKE: {
        const exception = candidates(family, [family.exceptionCandidate].filter(Boolean))[0];
        // Kein endgültiger Ausschluss: Die übrigen Untergruppen kommen ganz am Schluss (NEGATIVE_GROUP_POLICY).
        if (NEGATIVE_LAST) add('negative', candidates(family).filter((child) => child !== exception && open(child)), REASONS.AFTER_NEGATIVE);
        if (!exception) break;
        if (!isDone(state, exception.id)) add('exception', [exception], REASONS.EXCEPTION);
        else if (LIKED.includes(rating(exception))) {
          const details = candidates(exception);
          const asked = details.filter((detail) => isDone(state, detail.id)).length;
          add('precise', details.filter(open).slice(0, Math.max(0, EXCEPTION_DETAIL_LIMIT - asked)), REASONS.EXCEPTION_DETAIL);
        }
        break;
      }
      case LIKE:
      case PREFER: {
        const all = candidates(family, family.contrastPair ?? []);
        const pair = all.slice(0, 2);
        const waiting = pair.filter(open);
        if (waiting.length > 0) {
          add('contrast', waiting, REASONS.CONTRAST);
          break;
        }
        const ratings = pair.map(rating);
        const differs = pair.length === 2 && ratings.every(isTasteSignal) && ratings[0] !== ratings[1];
        if (!differs) break;
        // Je ein konkretes Lebensmittel aus beiden Untergruppen, solange dort noch keines beantwortet ist.
        const details = pair
          .map((member) => candidates(member))
          .filter((children) => !children.some((child) => isDone(state, child.id)))
          .map((children) => children.find(open))
          .filter(Boolean);
        add('precise', details, REASONS.DIFFERENCE_DETAIL);
        add('difference', all.slice(2).filter(open), REASONS.DIFFERENCE);
        break;
      }
      case UNFAMILIAR:
        clarify(family, REASONS.AFTER_UNFAMILIAR);
        break;
      case INTOLERANT: {
        // Nur ein Teil ausgeschlossen (z. B. Haselnüsse): Den Geschmack für den Rest kennen wir noch nicht.
        const children = candidates(family);
        const answered = children.filter((child) => isDone(state, child.id));
        if (!answered.some((child) => isTasteSignal(rating(child))) && answered.length < UNKNOWN_CHILD_LIMIT) {
          add('difference', children.filter(open).slice(0, UNKNOWN_CHILD_LIMIT - answered.length), REASONS.AFTER_INTOLERANT);
        }
        break;
      }
      default:
        break;
    }
  }

  // Untergruppen mit konkreten Lebensmitteln: Klärung nach „Kenne ich nicht“, Favoriten nach „Mag ich sehr“.
  for (const subgroup of index.cards.filter((card) => card.stage === 2 && card.children.length > 0 && isDone(state, card.id))) {
    // War die Untergruppe selbst eine Klärungskarte (Gruppe unbekannt), bleibt es bei höchstens zwei Klärungskarten.
    if (rating(subgroup) === UNFAMILIAR) {
      if (rating(index.get(subgroup.parentId)) !== UNFAMILIAR) clarify(subgroup, REASONS.AFTER_UNFAMILIAR_DETAIL);
    }
    else if (rating(subgroup) === PREFER) {
      const details = candidates(subgroup);
      const asked = details.filter((detail) => isDone(state, detail.id)).length;
      add('favorite', details.filter(open).slice(0, Math.max(0, FAVORITE_LIMIT - asked)), REASONS.FAVORITE_DETAIL);
    }
  }

  // Keine Karte doppelt (eine Karte kann über zwei Regeln kommen): die erste Regel gilt.
  const seen = new Set();
  return TIERS.flatMap((tier) => interleave(tiers[tier])).filter((entry) => !seen.has(entry.card.id) && seen.add(entry.card.id));
}

// Jede Runde bleibt auf ihrer Ebene. Die fachlichen Ausnahme-, Kontrast- und Favoritenregeln
// bestimmen innerhalb dieser Ebene die Priorität; unerledigte gröbere Karten wandern nicht nach unten.
export function rankedStageCards(state, mode = SELECTION.FIXED, stage = state.round) {
  const familyId = (card) => {
    while (card.parentId) card = state.index.get(card.parentId);
    return card.id;
  };
  const askedByFamily = new Map();
  for (const id of state.roundSequence ?? []) {
    const family = familyId(state.index.get(id));
    askedByFamily.set(family, (askedByFamily.get(family) ?? 0) + 1);
  }
  // Nach jeder Antwort neu ausgleichen: Das blosse Verschachteln der offenen Listen würde
  // sonst erneut mit derselben Familie beginnen und ihre Kinder nacheinander abfragen.
  const balance = (entries) => {
    const reasons = new Map();
    for (const entry of entries) {
      if (!reasons.has(entry.reason)) reasons.set(entry.reason, []);
      reasons.get(entry.reason).push(entry);
    }
    return [...reasons.values()].flatMap((group) => group.sort((a, b) => (askedByFamily.get(familyId(a.card)) ?? 0) - (askedByFamily.get(familyId(b.card)) ?? 0)));
  };
  const preferred = balance(rankedCards(state, mode, { stage }).filter((entry) => entry.card.stage === stage));
  if (stage !== 3) return preferred;
  const details = state.index.cards.filter((card) => card.stage === 2 && card.children.length > 0);
  const extra = details.map((parent) => {
    const rating = currentRating(state, parent.id);
    if (mode === SELECTION.ADAPTIVE && (!isDone(state, parent.id) || ![LIKE, PREFER, UNFAMILIAR, INTOLERANT].includes(rating))) return [];
    const children = usableChildren(state, parent);
    const asked = children.filter((card) => isDone(state, card.id)).length;
    const limit = mode !== SELECTION.ADAPTIVE ? children.length : rating === PREFER ? FAVORITE_LIMIT : UNKNOWN_CHILD_LIMIT;
    const reason = mode !== SELECTION.ADAPTIVE ? REASONS.FIXED_STAGE3 : rating === UNFAMILIAR ? REASONS.AFTER_UNFAMILIAR_DETAIL : REASONS.DETAIL;
    return children.filter((card) => card.stage === 3 && !isDone(state, card.id)).slice(0, Math.max(0, limit - asked)).map((card) => ({ card, reason }));
  });
  // Negative Untergruppe (oder nie gefragte Untergruppe einer negativen Gruppe): kein Ausschluss, ihre konkreten
  // Lebensmittel kommen ganz am Schluss (NEGATIVE_GROUP_POLICY 'last'), höchstens so viele wie sonst bei Details.
  const negative = !NEGATIVE_LAST || mode !== SELECTION.ADAPTIVE ? [] : details.map((parent) => {
    const own = currentRating(state, parent.id);
    const groupNegative = own === DISLIKE || (own == null && currentRating(state, parent.parentId) === DISLIKE);
    if (!groupNegative) return [];
    const children = usableChildren(state, parent);
    const asked = children.filter((card) => isDone(state, card.id)).length;
    return children
      .filter((card) => card.stage === 3 && !isDone(state, card.id))
      .slice(0, Math.max(0, UNKNOWN_CHILD_LIMIT - asked))
      .map((card) => ({ card, reason: REASONS.AFTER_NEGATIVE_DETAIL }));
  });
  const seen = new Set();
  return [...preferred, ...balance(interleave(extra)), ...balance(interleave(negative))].filter((entry) => !seen.has(entry.card.id) && seen.add(entry.card.id));
}
