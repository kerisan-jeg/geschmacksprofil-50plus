// Einheitliche Suche (FoodSearch, A7) über Allergene, Karten (Familien und Untergruppen),
// einzelne Lebensmittel (Beispiele auf den Karten und das Lexikon „foods“ im Katalog) und Merkmale.
// Eine Komponente nutzt sie überall: Allergien und Unverträglichkeiten (Frage 2), „Nie vorschlagen“
// (Frage 3) und „Mein Profil“.
//
// Tolerant gegenüber Gross-/Kleinschreibung und Umlauten (ä = ae = a, siehe search.js).
// Synonyme: Feld `synonyms` bei Karten, Allergenen und im Lexikon `foods`, inkl. Schweizer Begriffe
// (Rahm/Sahne, Poulet/Hähnchen, Rüebli/Karotte, Peperoni/Paprika, Nüsslisalat/Feldsalat).
// Lexikon-Synonyme gelten auch für Karten, die das Wort als Synonym tragen (Poulet → Geflügel).
//
// Treffer: { key, kind, label, category, matchedTerm, rank, ids? }
//   kind 'allergen' – key = Allergen-ID oder „all:<Kategorie>“, ids = granulare Allergen-IDs
//   kind 'card'     – key = „card:<ID>“
//   kind 'food'     – key = „food:<Wort>“ (keine eigene Karte: blendet das Wort als Beispiel aus)
//   kind 'tag'      – key = z. B. „animalOrigin:seafood“
// category ist der Name der Gruppe für die Anzeige („Haselnuss · Nüsse“); null bei Familien und Merkmalen.

import { matchRank, normalizeVariants, search, typoDistance } from './search.js';
import { allergenSearchItems } from './allergens.js';

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sameWord(a, b) {
  return matchRank(a, b) === 0 && matchRank(b, a) === 0;
}

// Dasselbe Wort oder seine Mehrzahl („Linse“ und „Linsen“, „Ei“ und „Eier“, „Haselnuss“ und „Haselnüsse“).
function sameOrPlural(a, b) {
  if (sameWord(a, b)) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return normalizeVariants(long).some((full) =>
    normalizeVariants(short).some((stem) => stem.length >= 2 && full.startsWith(stem) && /^(n|en|e|er|s|nen)$/.test(full.slice(stem.length)))
  );
}

// Lebensmittellisten zusammenführen: Der erste Eintrag gewinnt (handgepflegte Schweizer Begriffe vor der
// BLV-Liste). Gleich ist, was denselben Namen hat oder den Namen des anderen als Synonym führt
// („Zucchini“ mit Synonym „Zucchetti“ und „Zucchetti“ mit Synonym „Zucchini“): Synonyme werden ergänzt.
export function mergeFoods(...lists) {
  const merged = [];
  const byWord = new Map(); // Namen und Synonyme der bisherigen Einträge
  const byName = new Map(); // nur Namen
  const id = (word) => normalizeVariants(word)[0];
  for (const food of lists.flat()) {
    const words = [food.name, ...(food.synonyms ?? [])];
    const existing = byWord.get(id(food.name)) ?? (food.synonyms ?? []).map((word) => byName.get(id(word))).find(Boolean);
    if (existing) {
      for (const word of words) {
        if (id(word) !== id(existing.name) && !existing.synonyms.some((term) => id(term) === id(word))) existing.synonyms.push(word);
        if (!byWord.has(id(word))) byWord.set(id(word), existing);
      }
      continue;
    }
    const entry = { ...food, synonyms: [...(food.synonyms ?? [])] };
    merged.push(entry);
    byName.set(id(food.name), entry);
    for (const word of words) if (!byWord.has(id(word))) byWord.set(id(word), entry);
  }
  return merged;
}

function familyOf(index, card) {
  let current = card;
  while (current?.parentId) current = index.get(current.parentId);
  return current;
}

// Lexikon-Synonyme für einen Begriff (z. B. „Poulet“ → „Hähnchen“, „Hühnchen“; „Linsen“ → Synonyme von „Linse“).
function lexiconTerms(foods, term) {
  return foods
    .filter((food) => sameOrPlural(food.name, term))
    .flatMap((food) => [food.name, ...(food.synonyms ?? [])])
    .filter((word) => !sameWord(word, term));
}

// Karten, Lebensmittel aus den Beispielen und aus dem Lexikon. Ein Wort, das schon Titel oder Synonym
// einer Karte ist, erscheint nur als Karte (keine doppelten Treffer).
export function catalogItems(index, foods = []) {
  const items = [];
  const covered = [];
  for (const card of index.cards) {
    const family = familyOf(index, card);
    const own = card.synonyms ?? [];
    const terms = [...own, ...[card.title, ...own].flatMap((term) => lexiconTerms(foods, term))];
    items.push({ key: `card:${card.id}`, kind: 'card', label: card.title, category: family && family.id !== card.id ? family.title : null, terms });
    covered.push(card.title, ...own);
  }
  // Ein Lebensmittel, das schon eine Karte ist (auch als Einzahl: „Linse“ zu „Linsen“), erscheint nur als Karte.
  const isCovered = (text) => covered.some((term) => sameOrPlural(term, text));
  const seen = new Set();
  const addFood = (word, card, category = null) => {
    const label = capitalize(word);
    const id = normalizeVariants(label)[0];
    if (seen.has(id) || isCovered(label)) return;
    seen.add(id);
    const family = card ? familyOf(index, card) : null;
    items.push({ key: `food:${label}`, kind: 'food', label, category: family?.title ?? category, terms: lexiconTerms(foods, label) });
  };
  // Lexikon zuerst: Es kennt die richtige Gruppe auch für Wörter, die auf keiner Karte stehen
  // (handgepflegt: Karte; Schweizer Nährwertdatenbank: Gruppe als Text, z. B. „Olive · Gemüse“).
  for (const food of foods) addFood(food.name, index.get(food.card), food.category ?? null);
  for (const card of index.cards) {
    for (const example of card.examples) addFood(example, card);
  }
  return items;
}

export function tagItems(tagLabels = {}) {
  return Object.entries(tagLabels).map(([key, label]) => ({ key, kind: 'tag', label, category: null, terms: [] }));
}

// Suchindex für eine Verwendung. sources: welche Arten von Treffern angeboten werden.
export function buildFoodIndex({ catalogIndex, foods = [], allergens = null, tagLabels = null }) {
  const items = [...(allergens ? allergenSearchItems(allergens) : []), ...(catalogIndex ? catalogItems(catalogIndex, foods) : [])];
  for (const tag of tagItems(tagLabels ?? {})) {
    if (!items.some((item) => item.label === tag.label)) items.push(tag);
  }
  return items;
}

// Höchstens `limit` Treffer, ab dem ersten Zeichen. Genau passende Wörter zuerst („Käse“ vor „Kasein“),
// dann nach Rang; bei gleichem Rang Allergene, Karten, einzelne Lebensmittel (stabile Sortierung).
// Ohne Treffer: ähnliche Wörter bei Tippfehlern („Olvie“ → Olive), höchstens 3, mit fuzzy: true.
export function searchFoods(items, query, { limit = 6 } = {}) {
  const order = { allergen: 0, card: 1, tag: 1, food: 2 };
  // genau das Wort oder seine Mehrzahl („Oliven“ → Olive vor Olivenöl)
  const exact = (hit) => (sameOrPlural(hit.matchedTerm ?? hit.label, query) ? 0 : 1);
  const hits = search(items, query, items.length);
  if (hits.length === 0) return similarFoods(items, query, Math.min(limit, 3));
  return hits
    .map((hit, position) => ({ hit, position, exact: exact(hit) }))
    .sort((a, b) => a.exact - b.exact || a.hit.rank - b.hit.rank || order[a.hit.kind] - order[b.hit.kind] || a.position - b.position)
    .slice(0, limit)
    .map(({ hit }) => hit);
}

function similarFoods(items, query, limit) {
  const found = [];
  for (const item of items) {
    let best = null;
    for (const term of [item.label, ...(item.terms ?? [])]) {
      const distance = typoDistance(term, query);
      if (distance !== null && (best === null || distance < best.distance)) best = { distance, term };
    }
    if (best) found.push({ ...item, rank: 3, fuzzy: true, distance: best.distance, matchedTerm: best.term === item.label ? null : best.term });
  }
  return found.sort((a, b) => a.distance - b.distance || a.label.localeCompare(b.label, 'de')).slice(0, limit);
}

// Für die Hervorhebung: Text in Abschnitte teilen, der passende Teil mit match: true.
// Arbeitet mit derselben Toleranz wie die Suche: Gross-/Kleinschreibung, ä = a und ä = ae.
const FOLDINGS = [
  { ä: 'a', ö: 'o', ü: 'u', ß: 'ss' },
  { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' },
];

function foldChar(char, folding) {
  const lower = char.toLowerCase();
  return (folding[lower] ?? lower).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Text gefaltet, mit Rückverweis jedes gefalteten Zeichens auf das Originalzeichen.
function foldText(chars, folding) {
  let folded = '';
  const origin = [];
  chars.forEach((char, index) => {
    const value = foldChar(char, folding);
    folded += value;
    for (let i = 0; i < value.length; i += 1) origin.push(index);
  });
  return { folded, origin };
}

export function highlightParts(text, query) {
  const source = String(text ?? '');
  const chars = [...source];
  const queries = [...new Set(FOLDINGS.flatMap((folding) => normalizeVariants(query).map((variant) => [...variant].map((char) => foldChar(char, folding)).join(''))))].filter(Boolean);
  if (!source || queries.length === 0) return [{ text: source, match: false }];
  let best = null;
  for (const folding of FOLDINGS) {
    const { folded, origin } = foldText(chars, folding);
    for (const q of queries) {
      let at = folded.indexOf(q);
      while (at !== -1) {
        const wordStart = at === 0 || /[\s\-–(),/]/.test(folded[at - 1]);
        const start = origin[at];
        const end = origin[at + q.length - 1] + 1;
        const better = !best || (wordStart && !best.wordStart) || (wordStart === best.wordStart && (start < best.start || (start === best.start && end > best.end)));
        if (better) best = { start, end, wordStart };
        at = folded.indexOf(q, at + 1);
      }
    }
  }
  if (!best) return [{ text: source, match: false }];
  return [
    { text: chars.slice(0, best.start).join(''), match: false },
    { text: chars.slice(best.start, best.end).join(''), match: true },
    { text: chars.slice(best.end).join(''), match: false },
  ].filter((part) => part.text);
}
