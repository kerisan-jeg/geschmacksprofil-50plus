// Ergebnis-Dashboard und Profilstand (nurec v0.2, Anhang B). Reine Funktionen.
//
// Das Dashboard erscheint nach der ersten Runde und nach jeder weiteren kurzen Runde. Es zeigt getrennt:
//   - was ausdrücklich beantwortet wurde (bestätigte Favoriten, Vorlieben für Gruppen, „Eher ungern“ mit Ausnahmen),
//   - was nur vorsichtig abgeleitet ist (mögliche Favoriten, Vermutungen: derivedEntries in engine.js),
//   - wo noch Geschmacksinformation fehlt („Kenne ich nicht“ getrennt von „noch nicht gefragt“),
//   - Feinheiten (roh gegenüber gegart, nur wenn getrennt beantwortet) und Gerichte (Stufe 4, separat).
//
// Profilstand (B2): „Profil aufgebaut“ in Prozent ist ein Erfassungsgrad, keine Trefferquote. Punkte:
//   Stufe 1  bis 35  Anteil der zulässigen Gruppen mit ausdrücklicher Geschmacksantwort
//   Stufe 2  bis 30  Anteil der Zweige, deren Ausnahme bzw. Kontrastpaar beantwortet ist (Teilpunkte je Karte);
//                    nach „Kenne ich nicht“ zählt der Zweig, sobald ein Kind eine Geschmacksantwort hat
//   Stufe 3  bis 35  konkrete Lebensmittel mit Geschmacksantwort, voll ab PROFILE_PROGRESS.stage3Target
//   Gerichte zählen nicht (B2: „erweitern das Profil, erhöhen diese Basisanzeige aber nicht automatisch“).
// „Kenne ich nicht“ und unbeantwortete Karten geben keine Punkte. Ausschlüsse entfernen Karten aus dem relevanten
// Raum: Eine vegane Person muss keine Fleischkarten wischen, um einen hohen Stand zu erreichen.

import { PROFILE_PROGRESS } from '../config.js';
import { ANSWER_ORDER, DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR, isTasteSignal } from './answers.js';
import { isConcrete, isDish } from './catalog.js';
import { isVisible } from './filter.js';
import { branchCards, currentRating, isDone, isUsable, rankedCards, REASONS, SELECTION } from './selection.js';
import { cuisineTendencies } from './cuisines.js';

const LIKED = [LIKE, PREFER];
const BRANCH_REASONS = [REASONS.AFTER_UNFAMILIAR, REASONS.EXCEPTION, REASONS.CONTRAST];

// Karten mit direkter Bewertung in der Reihenfolge der Antworten (beim Wischen, dann im Profil bestätigt).
function ratedIds(state) {
  return [...state.sequence, ...(state.profileRated ?? [])].filter((id, position, list) => list.indexOf(id) === position);
}

function relevantFamilies(state) {
  return state.index.cards.filter((card) => card.stage === 1 && isVisible(card, state.index, state.exclusions));
}

// Wie weit ein Zweig (Gruppe mit Untergruppen) auf Stufe 2 geklärt ist: 0 bis 1.
function branchCredit(state, family) {
  const rating = currentRating(state, family.id);
  if (!isDone(state, family.id) || rating == null) return 0;
  if (rating === UNFAMILIAR || rating === INTOLERANT) {
    const children = state.index.childrenOf(family.id);
    return children.some((child) => isDone(state, child.id) && isTasteSignal(currentRating(state, child.id))) ? 1 : 0;
  }
  const required = branchCards(state, family);
  if (required.length === 0) return 1;
  return required.filter((card) => isDone(state, card.id)).length / required.length;
}

// Profilstand nach Anhang B2. Liefert { percent, points: { stage1, stage2, stage3 }, stage } mit stage = höchste
// abgeschlossene Stufe (0, 1 oder 2): Stufe 1, wenn jede zulässige Gruppe beantwortet ist; Stufe 2, wenn zusätzlich
// keine Ausnahme, kein Kontrast und keine Klärung mehr offen ist.
export function profileProgress(state, weights = PROFILE_PROGRESS) {
  const families = relevantFamilies(state);
  const tasted = (card) => isTasteSignal(currentRating(state, card.id));
  const stage1 = families.length > 0 ? (weights.stage1 * families.filter(tasted).length) / families.length : 0;
  const branches = families.filter((family) => state.index.childrenOf(family.id).some((child) => isUsable(state, child)));
  const stage2 = branches.length > 0 ? (weights.stage2 * branches.reduce((sum, family) => sum + branchCredit(state, family), 0)) / branches.length : 0;
  const concrete = ratedIds(state)
    .map((id) => state.index.get(id))
    .filter((card) => card?.stage === 3 && tasted(card)).length;
  const stage3 = weights.stage3 * Math.min(1, concrete / weights.stage3Target);
  const stage1Done = families.length > 0 && families.every((family) => isDone(state, family.id));
  const pendingBranches = rankedCards(state, SELECTION.ADAPTIVE).some((entry) => BRANCH_REASONS.includes(entry.reason));
  let stage = 0;
  if (stage1Done) stage = pendingBranches ? 1 : 2;
  const round = (value) => Math.round(value * 10) / 10;
  return {
    percent: Math.min(100, Math.round(stage1 + stage2 + stage3)),
    points: { stage1: round(stage1), stage2: round(stage2), stage3: round(stage3) },
    stage,
  };
}

// Inhalt des Dashboards (Anhang B1 und B3). Alle Listen enthalten Karten-IDs, die Oberfläche holt Titel und Bild.
//   favorites:  bestätigte Top-Favoriten: konkrete Karten mit direktem „Mag ich sehr“ (zuerst) oder „Mag ich“
//   groups:     Vorlieben für Gruppen und Untergruppen (kein bestätigter Platz für ungefragte Mitglieder)
//   dislikes:   „Mag ich nicht“ mit Ausnahmen darunter (Nachkommen mit „Mag ich“ oder „Mag ich sehr“)
//   unfamiliar: „Kenne ich nicht“
//   unasked:    zulässige Gruppen, die noch nie gefragt wurden
//   details:    Feinheiten roh gegenüber gegart, nur wenn beide beantwortet sind und sich unterscheiden
//   dishes:     bewertete Gerichte (Stufe 4), getrennt von den Lebensmitteln
//   cuisines:   vorsichtige Tendenz je Esskultur, erst ab CUISINE_MIN_RATED bewerteten Gerichten (cuisines.js)
export function buildDashboard(state, { cuisines: cuisineTable = [] } = {}) {
  const { index } = state;
  const rated = ratedIds(state)
    .map((id) => ({ card: index.get(id), rating: currentRating(state, id) }))
    .filter((entry) => entry.card && entry.rating != null);
  const food = rated.filter((entry) => !isDish(entry.card));
  const byRating = (list, rating) => list.filter((entry) => entry.rating === rating).map((entry) => entry.card.id);

  // Disjunkte Antwortkategorien: nur letzte direkte Angaben pro Karte, inklusive unbekannter Gerichte.
  // INTOLERANT, entfernte Antworten und Vermutungen zählen hier nie als Geschmack oder Antwort.
  const kindOf = (card) => isDish(card) ? 'dish' : isConcrete(card) ? 'food' : 'group';
  const responses = Object.fromEntries(ANSWER_ORDER.map((rating) => [rating, rated
    .filter((entry) => entry.rating === rating)
    .map(({ card }) => ({ id: card.id, rating, kind: kindOf(card) }))]));
  const answers = Object.values(responses).flat();
  const summary = {
    total: answers.length,
    groups: answers.filter((entry) => entry.kind === 'group').length,
    foods: answers.filter((entry) => entry.kind === 'food').length,
    dishes: answers.filter((entry) => entry.kind === 'dish').length,
  };

  const favorites = [...byRating(food.filter((entry) => isConcrete(entry.card)), PREFER), ...byRating(food.filter((entry) => isConcrete(entry.card)), LIKE)].map(
    (id) => ({ id, rating: currentRating(state, id) })
  );
  const groups = food
    .filter((entry) => !isConcrete(entry.card) && LIKED.includes(entry.rating))
    .sort((a, b) => (a.rating === PREFER ? 0 : 1) - (b.rating === PREFER ? 0 : 1))
    .map((entry) => ({ id: entry.card.id, rating: entry.rating }));

  const descendantsOf = (card) => index.childrenOf(card.id).flatMap((child) => [child, ...descendantsOf(child)]);
  const dislikes = food
    .filter((entry) => entry.rating === DISLIKE)
    .map((entry) => ({
      id: entry.card.id,
      exceptions: descendantsOf(entry.card)
        .filter((child) => LIKED.includes(currentRating(state, child.id)) && isDone(state, child.id))
        .map((child) => ({ id: child.id, rating: currentRating(state, child.id) })),
    }));

  const unfamiliar = byRating(food, UNFAMILIAR);
  const unasked = relevantFamilies(state)
    .filter((card) => !isDone(state, card.id))
    .map((card) => card.id);

  const details = index.cards
    .filter((card) => card.variantOf)
    .map((cooked) => ({ cooked, raw: index.get(cooked.variantOf) }))
    .filter(({ cooked, raw }) => {
      const a = currentRating(state, raw.id);
      const b = currentRating(state, cooked.id);
      return isTasteSignal(a) && isTasteSignal(b) && a !== b;
    })
    .map(({ cooked, raw }) => ({ rawId: raw.id, cookedId: cooked.id, raw: currentRating(state, raw.id), cooked: currentRating(state, cooked.id) }));

  const dishes = rated.filter((entry) => isDish(entry.card) && isTasteSignal(entry.rating)).map((entry) => ({ id: entry.card.id, rating: entry.rating }));
  return { responses, summary, favorites, groups, dislikes, unfamiliar, unasked, details, dishes, cuisines: cuisineTendencies(index, dishes, cuisineTable) };
}
