// Esskulturen der Gerichte (Dozentenfeedback 19.10.2026, Verbesserung 6). Reine Funktionen.
// Die Küche ist nur ein Metadatum (cuisines im Katalog, Tabelle src/data/cuisines.json), nie auf der Karte.
// Tendenz: erst ab CUISINE_MIN_RATED bewerteten Gerichten einer Küche, als „eher gern / eher ungern / gemischt“, nie als
// feste Vorliebe. Nur Geschmacksantworten zählen; „Kenne ich nicht“ und „Vertrage ich nicht“ zählen nicht.
// Ein Gericht einer Unterküche (thai) zählt auch für den Oberbegriff (asian). Keine Ableitung von Herkunft.

import { CUISINE_MIN_RATED, PREFERENCE_MODEL } from '../config.js';
import { DISLIKE, LIKE, isTasteSignal } from './answers.js';

export const MIXED = 'MIXED';

// Küchen eines Gerichts inklusive Oberbegriffen.
export function cuisinesOf(card, table = []) {
  const out = [];
  for (const id of card?.cuisines ?? []) {
    for (let entry = table.find((cuisine) => cuisine.id === id); entry; entry = table.find((cuisine) => cuisine.id === entry.parent)) {
      if (!out.includes(entry.id)) out.push(entry.id);
      if (!entry.parent) break;
    }
    if (!table.some((cuisine) => cuisine.id === id) && !out.includes(id)) out.push(id);
  }
  return out;
}

// ratings: [{ id, rating }] der bewerteten Gerichte. Liefert [{ id, label, rated, direction }] nur für Küchen ab min.
export function cuisineTendencies(index, ratings, table = [], { min = CUISINE_MIN_RATED, model = PREFERENCE_MODEL } = {}) {
  const byCuisine = new Map();
  for (const { id, rating } of ratings) {
    if (!isTasteSignal(rating)) continue;
    for (const cuisine of cuisinesOf(index.get(id), table)) {
      if (!byCuisine.has(cuisine)) byCuisine.set(cuisine, []);
      byCuisine.get(cuisine).push(model.weights[rating]);
    }
  }
  return table
    .filter((cuisine) => (byCuisine.get(cuisine.id)?.length ?? 0) >= min)
    .map((cuisine) => {
      const scores = byCuisine.get(cuisine.id);
      const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
      return { id: cuisine.id, label: cuisine.label, rated: scores.length, direction: mean > 0 ? LIKE : mean < 0 ? DISLIKE : MIXED };
    });
}
