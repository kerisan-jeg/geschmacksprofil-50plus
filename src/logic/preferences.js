// Präferenzmodell: direkte Bewertungen und abgeleitete Vermutungen, sauber getrennt. Reine Funktionen.
//
// Direkt: die letzte Bewertung einer Karte (beim Wischen oder im Profil). Ihr Wert steht in
//   PREFERENCE_MODEL.weights (Mag ich nicht −1, Mag ich +1, Mag ich sehr +2). „Kenne ich nicht“ und
//   „Vertrage ich nicht“ sind keine Geschmackssignale und haben keinen Wert (answers.js).
// Vermutet: Eine Karte ohne eigene Bewertung erbt die Bewertung ihrer nächsten bewerteten Gruppe, pro Stufe
//   abgeschwächt (inheritFactor, Standard 0.5): „Obst: Mag ich“ → „Beeren: vermutlich +0.5“.
//   Variante für die Auswertung: Mit siblingWeight > 0 zählen bewertete Geschwister mit
//   („Beeren“ und „Kernobst“ bewertet → Vermutung für „Steinobst“).
//
// Vermutungen sind nie Bewertungen: Sie stehen getrennt im Profil, die Kartenauswahl folgt nur den direkten
// Antworten (selection.js), und an den Kontrollkarten wird geprüft, ob sie stimmen (docs/messkonzept.md).
// Alle Zahlen sind Annahmen [V] (config.js, PREFERENCE_MODEL).

import { PREFERENCE_MODEL } from '../config.js';
import { DISLIKE, LIKE, isTasteSignal } from './answers.js';

// Wert einer direkten Bewertung oder null (keine Bewertung, kein Geschmackssignal).
export function directScore(rating, model = PREFERENCE_MODEL) {
  return isTasteSignal(rating) ? model.weights[rating] : null;
}

// Nächste bewertete Gruppe darüber, abgeschwächt pro Stufe.
function inherited(index, card, scoreOf, model) {
  let current = card;
  let distance = 0;
  while (current?.parentId) {
    current = index.get(current.parentId);
    distance += 1;
    const score = current ? scoreOf(current.id) : null;
    if (score !== null) return { score: score * model.inheritFactor ** distance, basisId: current.id };
  }
  return null;
}

function siblingScores(index, card, scoreOf) {
  if (!card.parentId) return [];
  return index
    .childrenOf(card.parentId)
    .filter((sibling) => sibling.id !== card.id)
    .map((sibling) => scoreOf(sibling.id))
    .filter((score) => score !== null);
}

// ratings: { cardId: Antwort } mit der letzten direkten Bewertung je Karte.
// Liefert eine Map cardId → { score, direct, basisId }:
//   direct true:  eigene Bewertung (basisId ist die Karte selbst)
//   direct false: Vermutung; basisId ist die Gruppe, von der sie stammt (bzw. die Elternkarte bei Geschwistern)
// Karten ohne Grundlage fehlen in der Map (keine Vermutung möglich).
export function predictScores(index, ratings = {}, model = PREFERENCE_MODEL) {
  const scoreOf = (id) => directScore(ratings[id], model);
  const predictions = new Map();
  for (const card of index.cards) {
    const own = scoreOf(card.id);
    if (own !== null) {
      predictions.set(card.id, { score: own, direct: true, basisId: card.id });
      continue;
    }
    // Zusammengesetzte Produkte und Gerichte sind eigene Einheiten (nurec v0.2, Kap. 7): keine Vermutung aus
    // Zutaten oder Gruppen, und ihre Antwort geht nie auf Zutaten über.
    if (card.kind === 'COMPOSITE_FOOD' || card.kind === 'DISH') continue;
    const fromGroup = inherited(index, card, scoreOf, model);
    const siblings = model.siblingWeight > 0 ? siblingScores(index, card, scoreOf) : [];
    if (!fromGroup && siblings.length === 0) continue;
    let score = fromGroup?.score ?? 0;
    if (siblings.length > 0) {
      // Geschwister liegen eine Stufe neben der Karte und werden wie eine Stufe abgeschwächt.
      const siblingSum = siblings.reduce((sum, value) => sum + value * model.inheritFactor, 0);
      score = fromGroup
        ? (fromGroup.score + model.siblingWeight * siblingSum) / (1 + model.siblingWeight * siblings.length)
        : siblingSum / siblings.length;
    }
    predictions.set(card.id, { score, direct: false, basisId: fromGroup?.basisId ?? card.parentId });
  }
  return predictions;
}

// Richtung einer Vermutung: LIKE (vermutlich gern), DISLIKE (vermutlich nicht) oder null (unentschieden).
// „Mag ich sehr“ wird nie vermutet: Eine Gruppe „Mag ich sehr“ macht nicht jedes Mitglied zum Favoriten
// (answers.js, nurec v0.2, Kap. 4).
export function predictedRating(score) {
  if (score == null || score === 0) return null;
  return score > 0 ? LIKE : DISLIKE;
}
