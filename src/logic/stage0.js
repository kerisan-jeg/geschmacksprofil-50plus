// Stufe 0 (Onboarding): harte Ausschlüsse vor dem ersten Swipe (nurec v0.2, Kap. 2) [D].
//
// Leitregel aus dem Konzept: Diese Regeln stehen über jedem Geschmack. Eine Swipe-Antwort hebt
// sie nie auf, und ein DISLIKE ist kein Ausschluss.
//
// Aus den Antworten entstehen ExclusionEntries (siehe filter.js) mit source = "onboarding".
// Das Unsicherheits-Flag („Ich bin mir nicht sicher, ob es weitere gibt“) erzeugt KEINE Ausschlüsse;
// es führt nur dazu, dass beim Wischen auf „Vertrage ich nicht“ hingewiesen wird (A4).
// Freitext-Notizen aus Frage 3 filtern nichts (A7).
//
// Alle Funktionen sind rein: Gleiche Antworten ergeben immer dieselben Regeln.

import { allergenLabel, summarizeSelection } from './allergens.js';
import { search } from './search.js';

export const SOURCE_ONBOARDING = 'onboarding';
export const SOURCE_SWIPE = 'swipe';

export function emptyAnswers(questions) {
  const empty = {
    single: () => null,
    allergens: () => ({ gate: null, selected: [], unsureMore: false }),
    never: () => ({ gate: null, selected: [], notes: [] }),
  };
  return Object.fromEntries(questions.map((question) => [question.id, empty[question.type]()]));
}

// Eine Frage gilt als beantwortet, wenn eine Antwort gewählt ist.
// Bei „Ja“ muss etwas ausgewählt oder notiert sein, sonst bleibt unklar, was gemeint ist.
export function isAnswered(question, answer) {
  if (question.type === 'single') return answer != null;
  if (!answer || answer.gate == null) return false;
  if (answer.gate !== 'yes') return true;
  if (question.type === 'never') return answer.selected.length > 0 || answer.notes.length > 0;
  return answer.selected.length > 0;
}

// „Unsicher“ als Antwort oder „Ich bin mir nicht sicher, ob es weitere gibt“ nach einer Auswahl.
// Beides kann zusammen mit bekannten Allergien vorkommen.
export function uncertaintyFlag(answers) {
  const answer = answers.intolerances;
  if (!answer) return false;
  return answer.gate === 'unsure' || (answer.gate === 'yes' && answer.unsureMore === true);
}

// ---------- Frage 3: Suchindex über Karten, Familien und wenige Tags ----------

export function parseKey(key) {
  const [type, ...rest] = key.split(':');
  return { type, value: rest.join(':') };
}

export function neverSearchItems(question, catalogIndex) {
  const items = catalogIndex.cards.map((card) => {
    const parent = card.parentId ? catalogIndex.get(card.parentId) : null;
    return {
      key: `card:${card.id}`,
      label: card.title,
      detail: parent ? `aus „${parent.title}“` : 'ganze Gruppe',
      terms: card.synonyms ?? [],
    };
  });
  for (const [key, label] of Object.entries(question.tagLabels ?? {})) {
    if (!items.some((item) => item.label === label)) items.push({ key, label, detail: 'alles mit diesem Merkmal', terms: [] });
  }
  return items;
}

export function searchNever(question, catalogIndex, query, limit = 6) {
  return search(neverSearchItems(question, catalogIndex), query, limit);
}

// Anzeigename eines Eintrags aus Frage 3: Wortlaut der Schnellauswahl, sonst Katalogtitel.
export function neverLabel(question, catalogIndex, key) {
  const pick = question.quickPicks?.find((entry) => entry.key === key);
  if (pick) return pick.label;
  if (question.tagLabels?.[key]) return question.tagLabels[key];
  const { type, value } = parseKey(key);
  if (type === 'card') return catalogIndex.get(value)?.title ?? value;
  return value;
}

// ---------- Ableitung ----------

// Liefert:
//  - diet:          gewählte Ernährungsweise (wirkt über die Tabelle `diets`)
//  - exclusions:    ExclusionEntries mit source "onboarding"
//  - uncertain:     Unsicherheits-Flag (erzeugt keine Ausschlüsse)
//  - freeTextNotes: Notizen ohne Treffer (filtern nichts)
//  - cardLabels:    Wörter der Person je Karten-ID für Hinweise wie „Ohne Schweinefleisch“
//  - rules:         verständliche Liste für die Zusammenfassung (nurec v0.2, Kap. 2.2)
export function deriveOnboarding(definition, answers, { allergens, catalogIndex }) {
  const exclusions = [];
  const rules = [];
  const cardLabels = {};
  const byId = Object.fromEntries(definition.questions.map((question) => [question.id, question]));

  const diet = answers.diet ?? null;
  const dietRule = definition.diets?.[diet]?.rule;
  if (dietRule) rules.push({ id: `diet.${diet}`, kind: 'diet', text: dietRule, source: byId.diet.source });

  const intolerances = answers.intolerances;
  if (intolerances?.gate === 'yes') {
    for (const id of intolerances.selected) {
      exclusions.push({ type: 'allergen', value: id, source: SOURCE_ONBOARDING, origin: 'intolerances', label: allergenLabel(allergens, id) });
    }
    for (const line of summarizeSelection(allergens, intolerances.selected)) {
      rules.push({ id: `intolerances.${line.key}`, kind: 'allergen', text: line.text, source: byId.intolerances.source });
    }
  }

  const never = answers.never;
  const freeTextNotes = never?.gate === 'yes' ? [...never.notes] : [];
  if (never?.gate === 'yes') {
    for (const key of never.selected) {
      const { type, value } = parseKey(key);
      const label = neverLabel(byId.never, catalogIndex, key);
      exclusions.push({ type, value, source: SOURCE_ONBOARDING, origin: 'never', label });
      if (type === 'card') cardLabels[value] = label;
      rules.push({ id: `never.${key}`, kind: 'never', text: label, source: byId.never.source });
    }
  }

  return { diet, exclusions, uncertain: uncertaintyFlag(answers), freeTextNotes, cardLabels, rules };
}
