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

import { allergenLabel, categoryIds, summarizeSelection } from './allergens.js';
import { buildExclusions, foodMatches, isVisible, MEAT_KINDS } from './filter.js';
import { buildFoodIndex, searchFoods } from './foodSearch.js';

export const SOURCE_ONBOARDING = 'onboarding';
export const SOURCE_SWIPE = 'swipe';

// Frage 1 (Dozentenfeedback 19.10.2026 [K]): Ernährungsform, einzelne Ausschlüsse und Speisevorschriften getrennt.
//   form        Ernährungsform (none, pescetarian, vegetarian, vegan), wirkt über die Tabelle `diets`
//   exclusions  Einzelausschlüsse als kanonische Schlüssel (animalOrigin:pork, food:Alkohol …)
//   rules       Speisevorschriften (halal, kosher). Sie schliessen selbst nichts aus [V]: Vorgeschlagene
//               Ausschlüsse übernimmt die Person einzeln (dann stehen sie in exclusions).
// Es gibt keine Frage nach Religion und keine Ableitung daraus.
export const EMPTY_DIET = { form: null, exclusions: [], rules: [] };

// Frühere Stände: Frage 1 war eine Einfachauswahl. „Kein Schweinefleisch“ und „Kein Fisch“ werden zu
// Ernährungsform „keine besondere“ mit den gleichwertigen Einzelausschlüssen; gespeicherte Daten bleiben unverändert.
const LEGACY_DIETS = {
  no_pork: { form: 'none', exclusions: ['animalOrigin:pork'] }, // Gelatine über includes (wie früher)
  no_fish: { form: 'none', exclusions: ['animalOrigin:fish', 'animalOrigin:seafood'] },
};

export function isLegacyDiet(value) {
  return typeof value === 'string' && value in LEGACY_DIETS;
}

// Einzelausschlüsse mit allem, was sie einschliessen: „Kein Schweinefleisch“ schliesst Gelatine ein (oft vom Schwein).
export function withIncluded(question, keys) {
  const out = [];
  for (const key of keys) {
    if (!out.includes(key)) out.push(key);
    for (const extra of question?.exclusions?.find((entry) => entry.key === key)?.includes ?? []) if (!out.includes(extra)) out.push(extra);
  }
  return out;
}

// Was eine Restriktion zusätzlich einschliesst, egal wo sie erfasst wird (Frage 1, Suche in Frage 3, Profil).
// restrictions: Einzelausschlüsse aus Frage 1 (stage0.json), key: kanonischer Schlüssel.
export function restrictionIncludes(restrictions, key) {
  return restrictions?.find((entry) => entry.key === key)?.includes ?? [];
}

// Einträge für das Eingeschlossene (z. B. Gelatine bei Schweinefleisch), mit includedBy auf den Hauptpunkt.
export function includedEntries(restrictions, entry, extra = {}) {
  const key = `${entry.type}:${entry.value}`;
  return restrictionIncludes(restrictions, key).map((included) => ({
    ...parseKey(included),
    label: restrictions.find((other) => other.key === included)?.label ?? included,
    includedBy: key,
    ...extra,
  }));
}

// Welcher gewählte Punkt schliesst key schon ein? (z. B. Gelatine durch „Kein Schweinefleisch“)
export function includedBy(question, keys, key) {
  return question?.exclusions?.find((entry) => keys.includes(entry.key) && entry.key !== key && (entry.includes ?? []).includes(key)) ?? null;
}

export function dietAnswer(value) {
  if (value == null) return { ...EMPTY_DIET };
  if (typeof value === 'string') return { ...EMPTY_DIET, ...(LEGACY_DIETS[value] ?? { form: value }) };
  return { ...EMPTY_DIET, ...value, exclusions: [...(value.exclusions ?? [])], rules: [...(value.rules ?? [])] };
}

// Schon durch die Ernährungsform abgedeckt? (z. B. „Kein Fisch“ bei vegetarisch)
export function coveredByForm(definition, form, key) {
  const { type, value } = parseKey(key);
  const excluded = definition?.diets?.[form]?.excludesAnimalOrigin ?? [];
  // meat umfasst alle Fleischarten: Vegetarisch deckt „Kein Schweinefleisch“ ab
  return type === 'animalOrigin' && (excluded.includes(value) || (MEAT_KINDS.includes(value) && excluded.includes('meat')));
}

// Eine Karte, die genau einer Restriktion entspricht (restrictionTag im Katalog, z. B. „Schwein“), erzeugt
// dieselbe Ausschluss-ID wie Frage 1, Teil B: Dieselbe Restriktion wirkt immer gleich, egal wo sie erfasst wird.
export function canonicalKey(catalogIndex, key) {
  const { type, value } = parseKey(key);
  const tag = type === 'card' ? catalogIndex?.get(value)?.restrictionTag : null;
  return tag ? `animalOrigin:${tag}` : key;
}

export function emptyAnswers(questions) {
  const empty = {
    single: () => null,
    diet: () => ({ ...EMPTY_DIET }),
    // medical: ärztlich oder fachlich festgestellt (0.2); scopes: Geltungsbereich je Unverträglichkeit (0.3)
    allergens: () => ({ gate: null, selected: [], items: [], notes: [], unsureMore: false, medical: false, scopes: {} }),
    never: () => ({ gate: null, selected: [], notes: [], brands: [], origins: [] }),
  };
  return Object.fromEntries(questions.map((question) => [question.id, empty[question.type]()]));
}

// Eine Frage gilt als beantwortet, wenn eine Antwort gewählt ist.
// Bei „Ja“ muss etwas ausgewählt oder eingetragen sein, sonst bleibt unklar, was gemeint ist.
export function isAnswered(question, answer) {
  if (question.type === 'single') return answer != null;
  if (question.type === 'diet') return dietAnswer(answer).form != null;
  if (!answer || !question.gate.some((option) => option.id === answer.gate)) return false;
  if (answer.gate !== 'yes') return true;
  if (question.type === 'never') {
    return answer.selected.length + answer.notes.length + answer.brands.length + answer.origins.length > 0;
  }
  return answer.selected.length + answer.items.length + answer.notes.length > 0;
}

// „Ich bin mir nicht sicher, ob es weitere gibt“ nach einer Auswahl bekannter Allergien.
export function uncertaintyFlag(answers) {
  const answer = answers.intolerances;
  if (!answer) return false;
  return answer.gate === 'yes' && answer.unsureMore === true;
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

// ---------- Suche ----------
// Eine Suche für alle Stellen (FoodSearch, siehe foodSearch.js). Diese beiden Funktionen liefern
// die Treffer für Frage 2 und Frage 3; foods ist das Lexikon aus dem Katalog (Synonyme).

// Frage 2: Allergene und alle übrigen Lebensmittel aus dem Katalog.
export function searchIntolerances(allergens, catalogIndex, query, limit = 6, foods = []) {
  return searchFoods(buildFoodIndex({ allergens, catalogIndex, foods }), query, { limit });
}

// Frage 3: Lebensmittel aus dem Katalog und Merkmale (z. B. Meeresfrüchte).
export function searchNever(question, catalogIndex, query, limit = 6, foods = []) {
  return searchFoods(buildFoodIndex({ catalogIndex, foods, tagLabels: question.tagLabels }), query, { limit });
}

// Anzeigename eines Schlüssels: Wortlaut der Schnellauswahl, sonst Katalogtitel oder Text.
export function keyLabel(question, catalogIndex, key) {
  const pick = question?.quickPicks?.find((entry) => entry.key === key);
  if (pick) return pick.label;
  if (question?.tagLabels?.[key]) return question.tagLabels[key];
  const { type, value } = parseKey(key);
  if (type === 'card') return catalogIndex.get(value)?.title ?? value;
  // Fleischarten und Fisch: Name der entsprechenden Karte („Schweinefleisch“)
  if (type === 'animalOrigin') return catalogIndex?.cards.find((card) => card.restrictionTag === value)?.restrictionLabel ?? value;
  return value;
}

export const neverLabel = keyLabel;

// ---------- Ableitung ----------

function keyEntry(question, catalogIndex, rawKey, origin, cardLabels) {
  const key = canonicalKey(catalogIndex, rawKey);
  const { type, value } = parseKey(key);
  const label = keyLabel(question, catalogIndex, key);
  if (type === 'card') cardLabels[value] = label;
  // Gewählt als Karte (z. B. „Schweinefleisch“ in der Suche), gespeichert als kanonische Restriktion
  return { type, value, source: SOURCE_ONBOARDING, origin, label, ...(key !== rawKey ? { selectedAs: rawKey } : {}) };
}

function noteEntry(text, origin, extra = {}) {
  return { type: 'food', value: text, source: SOURCE_ONBOARDING, origin, label: text, freeText: true, ...extra };
}

// Unverträglichkeiten mit Geltungsbereich (nurec v0.2, 0.3: „vollständig meiden oder nur begrenzte Menge“).
// Eine begrenzte Menge wird gespeichert, aber nie als sichere Freigabe verwendet: Die Regel bleibt ein Ausschluss.
export const SCOPED_INTOLERANCES = ['lactose'];
export const SCOPES = { AVOID: 'avoid', LIMITED: 'limited' };

// Zusätze für Einträge aus Frage 2: Quelle der Vorgabe und Geltungsbereich.
function constraintExtra(answer, id) {
  const extra = {};
  if (answer.medical) extra.medical = true;
  if (SCOPED_INTOLERANCES.includes(id)) extra.scope = answer.scopes?.[id] ?? SCOPES.AVOID;
  return extra;
}

// Liefert:
//  - diet:          gewählte Ernährungsform (wirkt über die Tabelle `diets`)
//  - dietaryRules:  Speisevorschriften (halal, kosher), ohne eigene Wirkung auf die Karten
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

  const dietQuestion = byId.diet ?? null;
  const dietChoice = dietQuestion ? dietAnswer(answers.diet) : { ...EMPTY_DIET };
  const diet = dietChoice.form;
  const dietRule = definition.diets?.[diet]?.rule;
  if (dietRule) rules.push({ id: `diet.${diet}`, kind: 'diet', text: dietRule, source: dietQuestion.source });
  for (const key of withIncluded(dietQuestion, dietChoice.exclusions)) {
    // Durch die Ernährungsform schon abgedeckt (vegetarisch + kein Schwein): bleibt in der Antwort, damit es nach
    // einem Wechsel der Form wieder gilt, steht aber nicht doppelt in den Regeln.
    if (coveredByForm(definition, diet, key)) continue;
    const { type, value } = parseKey(key);
    const option = dietQuestion.exclusions?.find((entry) => entry.key === key);
    // Eingeschlossen (Gelatine bei Schwein): eigener Eintrag mit includedBy, im Profil zusammen mit dem Hauptpunkt
    const parent = dietChoice.exclusions.includes(key) ? null : includedBy(dietQuestion, dietChoice.exclusions, key);
    exclusions.push({
      type,
      value,
      source: SOURCE_ONBOARDING,
      origin: 'diet',
      label: option?.label ?? keyLabel(null, catalogIndex, key),
      ...(parent ? { includedBy: parent.key } : {}),
    });
    if (parent) continue;
    rules.push({ id: `diet.${key}`, kind: 'diet', text: option?.label ?? key, source: dietQuestion.source });
  }
  const dietaryRules = dietChoice.rules.filter((id) => dietQuestion?.rules?.some((rule) => rule.id === id));

  const intolerances = byId.intolerances ? answers.intolerances : null;
  if (intolerances?.gate === 'yes') {
    const question = byId.intolerances;
    for (const id of intolerances.selected) {
      exclusions.push({ type: 'allergen', value: id, source: SOURCE_ONBOARDING, origin: 'intolerances', label: allergenLabel(allergens, id), ...constraintExtra(intolerances, id) });
    }
    for (const line of summarizeSelection(allergens, intolerances.selected)) {
      rules.push({ id: `intolerances.${line.key}`, kind: 'allergen', text: line.text, source: question.source });
    }
    for (const key of intolerances.items) {
      const entry = { ...keyEntry(question, catalogIndex, key, 'intolerances', cardLabels), ...constraintExtra(intolerances, key) };
      exclusions.push(entry, ...includedEntries(dietQuestion?.exclusions, entry, { source: SOURCE_ONBOARDING, origin: 'intolerances' }));
      rules.push({ id: `intolerances.${key}`, kind: 'allergen', text: entry.label, source: question.source });
    }
    for (const note of intolerances.notes) {
      exclusions.push(noteEntry(note, 'intolerances', constraintExtra(intolerances, note)));
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
      // „Schweinefleisch“ über die Suche wirkt wie „Kein Schweinefleisch“ in Frage 1, Teil B (inkl. Gelatine)
      exclusions.push(entry, ...includedEntries(dietQuestion?.exclusions, entry, { source: SOURCE_ONBOARDING, origin: 'never' }));
      rules.push({ id: `never.${key}`, kind: 'never', text: entry.label, source: question.source });
    }
    for (const note of never.notes) {
      exclusions.push(noteEntry(note, 'never'));
      freeTextNotes.push(note);
      rules.push({ id: `never.note.${note}`, kind: 'note', text: note, source: question.source });
    }
  }

  return { diet, dietaryRules, exclusions, uncertain: uncertaintyFlag(answers), freeTextNotes, avoidBrands, avoidOrigins, cardLabels, rules };
}

// ---------- Schon ausgeschlossen? ----------

// Karten, die ein Eintrag für sich allein betreffen würde.
function affectedCards(entry, catalogIndex) {
  const alone = buildExclusions([entry], { index: catalogIndex });
  return catalogIndex.cards.filter((card) => {
    if (entry.type === 'food') return card.children.length === 0 && [card.title, ...card.examples].some((example) => foodMatches(example, entry.value));
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
  const check = redundancyFor(exclusions, catalogIndex);
  // Genau dieselbe Angabe schon in einer früheren Frage (z. B. „Kein Alkohol“ in Frage 1): nicht noch einmal anbieten
  const given = new Set(base.exclusions.map((entry) => `${entry.type}:${entry.value}`));
  const repeated = (key) => Boolean(key) && given.has(canonicalKey(catalogIndex, key));
  return { ...check, key: (key) => repeated(key) || check.key(key), hit: (hit) => repeated(hit.key) || check.hit(hit) };
}

// Dieselbe Prüfung für bereits berechnete Ausschlüsse (z. B. in „Mein Profil“).
export function redundancyFor(exclusions, catalogIndex) {
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
