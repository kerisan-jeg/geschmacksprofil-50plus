// Alltagsprofil (nurec v0.2, Kap. 2.3 „Practical Suitability“) und Zuordnung von Marken und Händlern (Bereich 0.6).
// Reine Funktionen.
//
// Das Alltagsprofil ist freiwillig, kommt nach den Geschmacksrunden und ist keine Voraussetzung für Swipes.
// Ein übersprungenes Feld bleibt „unbekannt“ (null). Es steht im Event-Log als PRACTICAL_SAVED (letztes gilt),
// wirkt im Prototyp noch nicht auf die Karten (keine Produkt- oder Rezeptdaten) und fliesst nicht in den Profilstand.
// Ausdrücklich feste Grenzen (z. B. kein Ofen) werden als solche gespeichert, nicht als Allergie oder Abneigung.

import { normalizeVariants } from './search.js';
import { PRACTICAL_SAVED, eventType } from './events.js';

export const EMPTY_PRACTICAL = {
  cookingTime: { weekday: null, weekend: null },
  appliances: null,
  budget: null,
  budgetLimit: null,
  shops: null,
  brandsPreferred: [],
  brandsAvoided: [],
  convenience: null,
  household: null,
  leftovers: null,
};

export function practicalOf(events = []) {
  let practical = null;
  for (const event of events) if (eventType(event) === PRACTICAL_SAVED) practical = event.practical;
  return practical ? { ...EMPTY_PRACTICAL, ...practical, cookingTime: { ...EMPTY_PRACTICAL.cookingTime, ...(practical.cookingTime ?? {}) } } : null;
}

// Wie viele der sechs Bereiche beantwortet sind (für „Alltagsprofil: 4 von 6 Angaben“).
export function practicalAnswered(definition, practical) {
  if (!practical) return 0;
  return definition.questions.filter((question) => {
    const value = practical[question.id];
    if (question.type === 'pair') return Object.values(value ?? {}).some((part) => part != null);
    if (question.type === 'multi') return Array.isArray(value) && value.length > 0;
    return value != null;
  }).length;
}

// Feste Grenzen aus dem Alltagsprofil: Geräte, die fehlen (nur wenn die Frage beantwortet ist).
export function missingAppliances(definition, practical) {
  if (!Array.isArray(practical?.appliances) || practical.appliances.length === 0) return [];
  const question = definition.questions.find((entry) => entry.id === 'appliances');
  return question.options.filter((option) => !practical.appliances.includes(option.id)).map((option) => option.id);
}

// Lesbare Zeilen für „Mein Profil“: { id, dimension, text } je beantworteter Bereich. labels: Überschriften für
// die Marken (labels.js, PRACTICAL.brandsPreferred und brandsAvoided).
export function summarizePractical(definition, practical, labels) {
  if (!practical) return [];
  const label = (question, id) => question.options.find((option) => option.id === id)?.label ?? id;
  const lines = [];
  for (const question of definition.questions) {
    const value = practical[question.id];
    const parts = [];
    if (question.type === 'pair') {
      parts.push(...question.parts.filter((part) => value?.[part.id] != null).map((part) => `${part.label}: ${label(question, value[part.id])}`));
    } else if (question.type === 'multi') {
      if (Array.isArray(value) && value.length > 0) parts.push(value.map((id) => label(question, id)).join(', '));
    } else if (value != null) {
      parts.push(label(question, value));
    }
    const follow = question.follow ? practical[question.follow.id] : null;
    if (follow != null) parts.push(label(question.follow, follow));
    if (parts.length > 0) lines.push({ id: question.id, dimension: question.dimension, text: parts.join(' · ') });
    if (question.id === 'shops') {
      if (practical.brandsPreferred?.length) lines.push({ id: 'brandsPreferred', dimension: labels.brandsPreferred, text: practical.brandsPreferred.join(', ') });
      if (practical.brandsAvoided?.length) lines.push({ id: 'brandsAvoided', dimension: labels.brandsAvoided, text: practical.brandsAvoided.join(', ') });
    }
  }
  return lines;
}

// ---------- Marken und Händler (Bereich 0.6 und Einkaufsorte) ----------

// Suchindex für FoodSearch: Händler und Marken mit Zusatz („M-Budget · Marke von Migros“).
export function brandItems(brands, labels) {
  return brands.entries.map((entry) => ({
    key: `brand:${entry.id}`,
    kind: 'brand',
    label: entry.name,
    category: entry.type === 'retailer' ? labels.retailer : entry.owner ? labels.brandOf(entry.owner) : labels.brand,
    terms: entry.synonyms ?? [],
  }));
}

// Ist ein eingetragener Text eine bekannte Marke oder ein Händler? Sonst bleibt er mit Status „prüfen“.
export function matchBrand(brands, text) {
  const id = (word) => normalizeVariants(word)[0];
  const target = id(text);
  return brands.entries.find((entry) => [entry.name, ...(entry.synonyms ?? [])].some((word) => id(word) === target)) ?? null;
}
