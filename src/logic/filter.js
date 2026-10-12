// Harte Ausschlüsse über Tags (A6). Keine Kartenlisten pro Allergie oder Ernährungsweise.
//
// Ein Ausschluss-Eintrag (ExclusionEntry):
//   { type: 'allergen' | 'animalOrigin' | 'card', value: string, source: 'onboarding' | 'swipe', origin?: string, label?: string }
//   - type 'allergen':     granulare Allergen-ID aus allergens.json, z. B. "hazelnut"
//   - type 'animalOrigin': z. B. "seafood" (Frage 3, Schnellauswahl „Meeresfrüchte“)
//   - type 'card':         Katalog-ID; schliesst die Karte und alle Nachkommen aus
//   - type 'food':         Lebensmittel als Text ohne eigene Karte, z. B. "Tomate" (Suche oder Freitext).
//                          Schliesst keine Karte aus, blendet das Wort aber als Beispiel auf allen Karten aus
//                          und erscheint als Hinweis „Ohne Tomate“ (Rückmeldung Team, 12.10.: Eingetragenes
//                          soll nicht nochmals vorkommen).
//   - source:              wo der Ausschluss entstanden ist (Onboarding oder „Vertrage ich nicht“ beim Wischen)
//
// Die Ernährungsweise ist kein Eintrag, sondern wird über die Tabelle `diets` (stage0.json)
// in animalOrigin-Ausschlüsse übersetzt.

import { descendantIds, isFamily } from './catalog.js';
import { normalizeVariants } from './search.js';

export function dietExclusions(diets, dietId) {
  return diets?.[dietId]?.excludesAnimalOrigin ?? [];
}

// Verdichtet Einträge und Ernährungsweise zu Mengen, die isAllowed() schnell prüfen kann.
// Mit `index` werden Karten-Ausschlüsse auf alle Nachkommen erweitert.
export function buildExclusions(entries = [], { diet = null, diets = {}, index = null } = {}) {
  const allergens = new Set();
  const animalOrigin = new Set(dietExclusions(diets, diet));
  const cardIds = new Set();
  const foods = [];

  for (const entry of entries) {
    if (entry.type === 'food') {
      if (!foods.includes(entry.value)) foods.push(entry.value);
    } else if (entry.type === 'allergen') allergens.add(entry.value);
    else if (entry.type === 'animalOrigin') animalOrigin.add(entry.value);
    else if (entry.type === 'card') {
      cardIds.add(entry.value);
      if (index) for (const id of descendantIds(index, entry.value)) cardIds.add(id);
    }
  }
  return { allergens, animalOrigin, cardIds, foods };
}

// Reine Entscheidung für eine einzelne Karte anhand ihrer eigenen Tags und ihrer ID.
export function isAllowed(card, exclusions) {
  if (exclusions.cardIds.has(card.id)) return false;
  if (card.allergens.some((tag) => exclusions.allergens.has(tag))) return false;
  if (card.animalOrigin.some((tag) => exclusions.animalOrigin.has(tag))) return false;
  return true;
}

// Sichtbarkeit inkl. Familienregel: Eine Familie wird nur angezeigt,
// wenn sie selbst erlaubt ist und mindestens ein Kind sichtbar bleibt.
export function isVisible(card, index, exclusions) {
  if (!isAllowed(card, exclusions)) return false;
  if (!isFamily(card)) return true;
  return index.childrenOf(card.id).some((child) => isVisible(child, index, exclusions));
}

export function visibleCards(cards, index, exclusions) {
  return cards.filter((card) => isVisible(card, index, exclusions));
}

// ---------- Lebensmittel als Text („Tomate“) ----------

function words(text) {
  return normalizeVariants(text).flatMap((variant) => variant.split(/[\s\-–(),/]+/).filter(Boolean));
}

// Passt ein Beispiel wie „rohe Tomaten“ zum Eintrag „Tomate“? Wortweise, ohne Gross-/Kleinschreibung
// und Umlaute; ab 4 Buchstaben zählt auch eine Endung („Tomate“ ↔ „Tomaten“).
export function foodMatches(example, food) {
  const targets = words(food);
  if (targets.length === 0) return false;
  const candidates = words(example);
  return targets.some((target) =>
    candidates.some((word) => word === target || (Math.min(word.length, target.length) >= 4 && (word.startsWith(target) || target.startsWith(word))))
  );
}

function isHiddenExample(example, exclusions) {
  return (exclusions.foods ?? []).some((food) => foodMatches(example, food));
}

// Alle Beispiele, die eine Karte zeigen könnte: eigene und die ihrer sichtbaren Nachkommen.
function examplePool(card, index, exclusions) {
  const own = isFamily(card) ? derivedExamples(card, index, exclusions) : card.examples;
  const children = index.childrenOf(card.id).filter((child) => isVisible(child, index, exclusions));
  return [...new Set([...own, ...children.flatMap((child) => examplePool(child, index, exclusions))])];
}

// Hinweise und Beispiele einer Karte an die Ausschlüsse anpassen:
// - Familien zeigen nur Beispiele aus sichtbaren Kindern und „Ohne Haselnüsse“.
// - Lebensmittel-Einträge („Tomate“) verschwinden aus den Beispielen und erscheinen als „Ohne Tomate“.
// labels: optionale Wörter der Person für eine Karten-ID, z. B. { 'F01.3': 'Schweinefleisch' }.
export function annotateCard(card, index, exclusions, labels = {}) {
  const hidden = isFamily(card) ? hiddenRoots(card, index, exclusions) : [];
  const pool = examplePool(card, index, exclusions);
  const hiddenFoods = (exclusions.foods ?? []).filter((food) => pool.some((example) => foodMatches(example, food)));
  if (hidden.length === 0 && hiddenFoods.length === 0) return card;

  let examples = hidden.length > 0 ? derivedExamples(card, index, exclusions) : card.examples;
  if (hiddenFoods.length > 0) {
    const kept = examples.filter((example) => !isHiddenExample(example, exclusions));
    const refill = pool.filter((example) => !kept.includes(example) && !isHiddenExample(example, exclusions));
    examples = [...kept, ...refill];
  }
  examples = examples.slice(0, 3);

  const names = [...hidden.map((id) => labels[id] ?? index.get(id).title), ...hiddenFoods];
  const notes = names.length <= 2 ? names.map((name) => `Ohne ${name}`) : [`Ohne ${names[0]}`, `und ${names.length - 1} weitere`];
  return { ...card, examples, notes };
}

// Oberste ausgeblendete Nachkommen, deren Elternteil sichtbar ist.
function hiddenRoots(card, index, exclusions) {
  const out = [];
  for (const child of index.childrenOf(card.id)) {
    if (!isVisible(child, index, exclusions)) out.push(child.id);
    else out.push(...hiddenRoots(child, index, exclusions));
  }
  return out;
}

function hasHiddenDescendant(card, index, exclusions) {
  return hiddenRoots(card, index, exclusions).length > 0;
}

function derivedExamples(card, index, exclusions) {
  if (!isFamily(card)) return card.examples.length > 0 ? card.examples : [card.title];
  if (!hasHiddenDescendant(card, index, exclusions)) return card.examples;
  const visible = index.childrenOf(card.id).filter((child) => isVisible(child, index, exclusions));
  if (visible.length === 1) return derivedExamples(visible[0], index, exclusions);
  return visible.map((child) => derivedExamples(child, index, exclusions)[0]);
}
