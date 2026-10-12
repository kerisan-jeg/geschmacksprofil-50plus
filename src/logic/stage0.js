// Stufe 0 (Onboarding): harte Ausschlüsse vor dem ersten Swipe (nurec v0.2, Kap. 2) [D].
//
// Leitregel aus dem Konzept: Diese Regeln stehen über jedem Geschmack. Eine Swipe-Antwort hebt
// sie nie auf, und ein DISLIKE ist kein Ausschluss.
//
// Aus den Antworten entstehen ExclusionEntries (siehe filter.js) mit source = "onboarding".
// Das Unsicherheits-Flag („Ich bin mir nicht sicher, ob es weitere gibt“) erzeugt KEINE Ausschlüsse;
// es führt nur dazu, dass beim Wischen auf „Vertrage ich nicht“ hingewiesen wird (A4).
//
// Rückmeldung Team (12.10.2026), ersetzt Teile von A5 und A7:
// - Die Suche in Frage 2 und 3 findet alle Lebensmittel (Allergene, Karten, Beispiele auf Karten).
// - Was man eintippt, wird immer eingetragen. Ohne eigene Karte wird es ein Lebensmittel-Eintrag
//   (type "food"): keine Karte fällt weg, aber das Wort erscheint nirgends mehr als Beispiel.
// - Marken und Herkunft werden gespeichert, wirken im Prototyp aber noch nicht (keine Daten dazu).
// - Was durch frühere Angaben schon ausgeschlossen ist, wird nicht nochmals angeboten.
//
// Alle Funktionen sind rein: Gleiche Antworten ergeben immer dieselben Regeln.

import { allergenLabel, categoryIds, searchAllergens, summarizeSelection } from './allergens.js';
import { buildExclusions, foodMatches, isVisible } from './filter.js';
import { matchRank, search } from './search.js';

export const SOURCE_ONBOARDING = 'onboarding';
export const SOURCE_SWIPE = 'swipe';

export function emptyAnswers(questions) {
  const empty = {
    single: () => null,
    allergens: () => ({ gate: null, selected: [], items: [], notes: [], unsureMore: false }),
    never: () => ({ gate: null, selected: [], notes: [], brands: [], origins: [] }),
  };
  return Object.fromEntries(questions.map((question) => [question.id, empty[question.type]()]));
}

// Eine Frage gilt als beantwortet, wenn eine Antwort gewählt ist.
// Bei „Ja“ muss etwas ausgewählt oder eingetragen sein, sonst bleibt unklar, was gemeint ist.
export function isAnswered(question, answer) {
  if (question.type === 'single') return answer != null;
  if (!answer || answer.gate == null) return false;
  if (answer.gate !== 'yes') return true;
  if (question.type === 'never') {
    return answer.selected.length + answer.notes.length + answer.brands.length + answer.origins.length > 0;
  }
  return answer.selected.length + answer.items.length + answer.notes.length > 0;
}

// „Unsicher“ als Antwort oder „Ich bin mir nicht sicher, ob es weitere gibt“ nach einer Auswahl.
// Beides kann zusammen mit bekannten Allergien vorkommen.
export function uncertaintyFlag(answers) {
  const answer = answers.intolerances;
  if (!answer) return false;
  return answer.gate === 'unsure' || (answer.gate === 'yes' && answer.unsureMore === true);
}

// ---------- Schlüssel ----------
// card:F01.3          Karte samt Nachkommen
// animalOrigin:seafood alles mit diesem Merkmal
// food:Tomate         Lebensmittel als Text (Beispiel auf einer Karte oder Freitext)

export function parseKey(key) {
  const [type, ...rest] = key.split(':');
  return { type, value: rest.join(':') };
}

function cleanText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

// ---------- Suchindex über den Katalog ----------

// Karten (Titel und Synonyme), Beispiele auf den Karten und einige Merkmale.
// Ein Beispiel, das schon Titel oder Synonym einer Karte ist, erscheint nur als Karte.
export function catalogSearchItems(catalogIndex, tagLabels = {}) {
  const items = [];
  const covered = [];
  for (const card of catalogIndex.cards) {
    const parent = card.parentId ? catalogIndex.get(card.parentId) : null;
    items.push({ key: `card:${card.id}`, label: card.title, detail: parent ? `aus „${parent.title}“` : 'ganze Gruppe', terms: card.synonyms ?? [] });
    covered.push(card.title, ...(card.synonyms ?? []));
  }
  const isCovered = (text) => covered.some((term) => matchRank(term, text) === 0 && matchRank(text, term) === 0);
  const seen = new Set();
  for (const card of catalogIndex.cards) {
    for (const example of card.examples) {
      const label = example.charAt(0).toUpperCase() + example.slice(1);
      const id = label.toLowerCase();
      if (seen.has(id) || isCovered(label)) continue;
      seen.add(id);
      items.push({ key: `food:${label}`, label, detail: `Beispiel aus „${card.title}“`, terms: [] });
    }
  }
  for (const [key, label] of Object.entries(tagLabels)) {
    if (!items.some((item) => item.label === label)) items.push({ key, label, detail: 'alles mit diesem Merkmal', terms: [] });
  }
  return items;
}

export function searchCatalog(catalogIndex, query, { tagLabels = {}, limit = 6 } = {}) {
  return search(catalogSearchItems(catalogIndex, tagLabels), query, limit);
}

// Frage 2: zuerst Allergene, dann alle übrigen Lebensmittel aus dem Katalog.
export function searchIntolerances(allergens, catalogIndex, query, limit = 6) {
  const allergenHits = searchAllergens(allergens, query, limit).map((hit) => ({ ...hit, kind: 'allergen' }));
  const catalogHits = searchCatalog(catalogIndex, query, { limit }).map((hit) => ({ ...hit, kind: 'catalog' }));
  return [...allergenHits, ...catalogHits].sort((a, b) => a.rank - b.rank).slice(0, limit);
}

export function searchNever(question, catalogIndex, query, limit = 6) {
  return searchCatalog(catalogIndex, query, { tagLabels: question.tagLabels, limit });
}

// Anzeigename eines Schlüssels: Wortlaut der Schnellauswahl, sonst Katalogtitel oder Text.
export function keyLabel(question, catalogIndex, key) {
  const pick = question?.quickPicks?.find((entry) => entry.key === key);
  if (pick) return pick.label;
  if (question?.tagLabels?.[key]) return question.tagLabels[key];
  const { type, value } = parseKey(key);
  if (type === 'card') return catalogIndex.get(value)?.title ?? value;
  return value;
}

export const neverLabel = keyLabel;

// ---------- Ableitung ----------

function keyEntry(question, catalogIndex, key, origin, cardLabels) {
  const { type, value } = parseKey(key);
  const label = keyLabel(question, catalogIndex, key);
  if (type === 'card') cardLabels[value] = label;
  return { type, value, source: SOURCE_ONBOARDING, origin, label };
}

function noteEntry(text, origin) {
  return { type: 'food', value: text, source: SOURCE_ONBOARDING, origin, label: text, freeText: true };
}

// Liefert:
//  - diet:          gewählte Ernährungsweise (wirkt über die Tabelle `diets`)
//  - exclusions:    ExclusionEntries mit source "onboarding"
//  - uncertain:     Unsicherheits-Flag (erzeugt keine Ausschlüsse)
//  - freeTextNotes: frei eingetippte Einträge ohne Treffer (als Lebensmittel-Eintrag wirksam, siehe oben)
//  - avoidBrands, avoidOrigins: Marken und Herkunft (gespeichert, im Prototyp ohne Wirkung)
//  - cardLabels:    Wörter der Person je Karten-ID für Hinweise wie „Ohne Schweinefleisch“
//  - rules:         verständliche Liste für die Zusammenfassung (nurec v0.2, Kap. 2.2)
// upTo: nur die Fragen bis zu diesem Index berücksichtigen (für „schon ausgeschlossen?“).
export function deriveOnboarding(definition, answers, { allergens, catalogIndex, upTo = Infinity }) {
  const exclusions = [];
  const rules = [];
  const cardLabels = {};
  const freeTextNotes = [];
  const questions = definition.questions.filter((_, index) => index <= upTo);
  const byId = Object.fromEntries(questions.map((question) => [question.id, question]));

  const diet = byId.diet ? answers.diet ?? null : null;
  const dietRule = definition.diets?.[diet]?.rule;
  if (dietRule) rules.push({ id: `diet.${diet}`, kind: 'diet', text: dietRule, source: byId.diet.source });

  const intolerances = byId.intolerances ? answers.intolerances : null;
  if (intolerances?.gate === 'yes') {
    const question = byId.intolerances;
    for (const id of intolerances.selected) {
      exclusions.push({ type: 'allergen', value: id, source: SOURCE_ONBOARDING, origin: 'intolerances', label: allergenLabel(allergens, id) });
    }
    for (const line of summarizeSelection(allergens, intolerances.selected)) {
      rules.push({ id: `intolerances.${line.key}`, kind: 'allergen', text: line.text, source: question.source });
    }
    for (const key of intolerances.items) {
      const entry = keyEntry(question, catalogIndex, key, 'intolerances', cardLabels);
      exclusions.push(entry);
      rules.push({ id: `intolerances.${key}`, kind: 'allergen', text: entry.label, source: question.source });
    }
    for (const note of intolerances.notes) {
      exclusions.push(noteEntry(note, 'intolerances'));
      freeTextNotes.push(note);
      rules.push({ id: `intolerances.note.${note}`, kind: 'note', text: note, source: question.source });
    }
  }

  const never = byId.never ? answers.never : null;
  const avoidBrands = never?.gate === 'yes' ? [...never.brands] : [];
  const avoidOrigins = never?.gate === 'yes' ? [...never.origins] : [];
  if (never?.gate === 'yes') {
    const question = byId.never;
    for (const key of never.selected) {
      const entry = keyEntry(question, catalogIndex, key, 'never', cardLabels);
      exclusions.push(entry);
      rules.push({ id: `never.${key}`, kind: 'never', text: entry.label, source: question.source });
    }
    for (const note of never.notes) {
      exclusions.push(noteEntry(note, 'never'));
      freeTextNotes.push(note);
      rules.push({ id: `never.note.${note}`, kind: 'note', text: note, source: question.source });
    }
  }

  return { diet, exclusions, uncertain: uncertaintyFlag(answers), freeTextNotes, avoidBrands, avoidOrigins, cardLabels, rules };
}

// ---------- Schon ausgeschlossen? ----------

// Karten, die ein Eintrag für sich allein betreffen würde.
function affectedCards(entry, catalogIndex) {
  const alone = buildExclusions([entry], { index: catalogIndex });
  return catalogIndex.cards.filter((card) => {
    if (entry.type === 'food') return card.children.length === 0 && card.examples.some((example) => foodMatches(example, entry.value));
    if (card.children.length > 0) return false;
    return !isVisible(card, catalogIndex, alone);
  });
}

// Prüft, ob Einträge nichts Neues mehr ausschliessen würden, weil alle betroffenen Karten
// durch die bisherigen Angaben schon wegfallen. Einträge ohne passende Karte (z. B. Sellerie)
// gelten nie als erledigt: Die Angabe ist trotzdem wichtig.
export function createRedundancyCheck(definition, answers, { allergens, catalogIndex, upTo }) {
  const base = deriveOnboarding(definition, answers, { allergens, catalogIndex, upTo });
  const exclusions = buildExclusions(base.exclusions, { diet: base.diet, diets: definition.diets, index: catalogIndex });
  const covered = (entry) => {
    const cards = affectedCards(entry, catalogIndex);
    return cards.length > 0 && cards.every((card) => !isVisible(card, catalogIndex, exclusions));
  };
  return {
    // Ein Allergen oder alle Allergene einer Kategorie
    allergenIds: (ids) => ids.length > 0 && ids.every((value) => covered({ type: 'allergen', value })),
    category: (category) => categoryIds(category).every((value) => covered({ type: 'allergen', value })),
    key: (key) => covered(parseKey(key)),
    hit: (hit) => (hit.ids ? hit.ids.every((value) => covered({ type: 'allergen', value })) : covered(parseKey(hit.key))),
  };
}

export { cleanText };
