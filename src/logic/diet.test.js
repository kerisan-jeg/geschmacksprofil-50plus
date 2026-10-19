// Frage 1 nach dem Dozentenfeedback vom 19.10.2026: Ernährungsform, Einzelausschlüsse, Speisevorschriften.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexCatalog } from './catalog.js';
import { canonicalKey, createRedundancyCheck, deriveOnboarding, dietAnswer, emptyAnswers, isAnswered, keyLabel } from './stage0.js';
import { deriveRoundState, eligibleFamilies, presentCard } from './engine.js';
import { annotateCard, buildExclusions, hasUnknownMeat, isAllowed, isVisible } from './filter.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const definition = read('../data/stage0.json');
const allergens = read('../data/allergens.json');
const catalog = read('../data/catalog.json');
const index = indexCatalog(catalog.cards);
const dietQuestion = definition.questions.find((question) => question.id === 'diet');

const empty = emptyAnswers(definition.questions);
const withDiet = (diet, changes = {}) => ({ ...empty, diet: { ...dietAnswer(null), ...diet }, ...changes });
const derive = (answers) => deriveOnboarding(definition, answers, { allergens, catalogIndex: index });
const stateFor = (answers) => deriveRoundState({ index, onboarding: derive(answers), diets: definition.diets });
const visibleIds = (answers) => {
  const state = stateFor(answers);
  return catalog.cards.filter((card) => isVisible(card, index, state.exclusions)).map((card) => card.id);
};
const withTag = (tag) => catalog.cards.filter((card) => card.animalOrigin.includes(tag)).map((card) => card.id);

test('Frage 1 hat drei Teile; Teil A ist Pflicht, B und C sind freiwillig', () => {
  assert.equal(dietQuestion.type, 'diet');
  assert.deepEqual(dietQuestion.options.map((option) => option.id), ['none', 'pescetarian', 'vegetarian', 'vegan']);
  assert.equal(dietQuestion.options[0].label, 'Keine besondere Ernährungsform');
  assert.equal(isAnswered(dietQuestion, empty.diet), false, 'ohne Ernährungsform nicht beantwortet');
  assert.equal(isAnswered(dietQuestion, { form: 'none', exclusions: [], rules: [] }), true);
  assert.deepEqual(dietQuestion.rules.map((rule) => rule.id), ['halal', 'kosher']);
});

test('Keine Religionsabfrage: kein Feld und keine Ableitung, auch nicht im Ergebnis', () => {
  assert.doesNotMatch(JSON.stringify(definition), /religi/i);
  const result = derive(withDiet({ form: 'none', rules: ['halal'] }));
  assert.doesNotMatch(JSON.stringify(result), /religi|muslim|jüd|islam/i);
});

test('Nur kein Schweinefleisch: „Fleisch und Geflügel“ bleibt und zeigt „Ohne Schweinefleisch“', () => {
  const state = stateFor(withDiet({ form: 'none', exclusions: ['animalOrigin:pork'] }));
  const family = presentCard(state, index.get('F01'));
  assert.equal(family.title, 'Fleisch und Geflügel');
  assert.deepEqual(family.notes, ['Ohne Schweinefleisch']);
  assert.ok(!isVisible(index.get('F01.3'), index, state.exclusions));
  for (const id of withTag('pork')) assert.ok(!isVisible(index.get(id), index, state.exclusions), `${id} mit Schwein`);
});

test('Kein Schwein und kein Rind: Karte heisst „Geflügel“ und zeigt keinen Hinweis auf Rind oder Schwein', () => {
  const answers = withDiet({ form: 'none', exclusions: ['animalOrigin:pork', 'animalOrigin:beef'] });
  const state = stateFor(answers);
  const family = presentCard(state, index.get('F01'));
  assert.equal(family.title, 'Geflügel');
  assert.deepEqual(family.notes ?? [], []);
  assert.doesNotMatch(family.examples.join(' '), /Rind|Schwein|Kalb/);
  // In keiner Runde: weder Lebensmittel noch Gerichte mit Rind oder Schwein
  const visible = new Set(visibleIds(answers));
  for (const id of [...withTag('pork'), ...withTag('beef')]) assert.ok(!visible.has(id), `${id} bleibt verborgen`);
  assert.ok(visible.has('F01.1') && visible.has('F01.1.1'), 'Geflügel bleibt');
});

test('Vegetarisch: kein Fleisch, kein Fisch, keine Meeresfrüchte, auch keine Gerichte damit', () => {
  const visible = new Set(visibleIds(withDiet({ form: 'vegetarian' })));
  for (const tag of ['meat', 'fish', 'seafood']) for (const id of withTag(tag)) assert.ok(!visible.has(id), `${id} (${tag})`);
  assert.ok(!eligibleFamilies(stateFor(withDiet({ form: 'vegetarian' }))).some((card) => card.id === 'F01'));
});

test('Vegetarisch und zusätzlich kein Schwein: keine doppelte Regel; nach Wechsel auf „keine“ gilt Schwein wieder', () => {
  const vegetarian = derive(withDiet({ form: 'vegetarian', exclusions: ['animalOrigin:pork'] }));
  assert.deepEqual(vegetarian.rules.map((rule) => rule.id), ['diet.vegetarian']);
  assert.deepEqual(vegetarian.exclusions, []);
  const back = derive(withDiet({ form: 'none', exclusions: ['animalOrigin:pork'] }));
  assert.deepEqual(back.exclusions.map(({ type, value, origin }) => [type, value, origin]), [['animalOrigin', 'pork', 'diet']]);
});

test('Halal ohne Bestätigung schliesst nichts aus, steht aber als Speisevorschrift im Ergebnis', () => {
  const result = derive(withDiet({ form: 'none', rules: ['halal'] }));
  assert.deepEqual(result.exclusions, []);
  assert.deepEqual(result.dietaryRules, ['halal']);
  assert.equal(eligibleFamilies(stateFor(withDiet({ form: 'none', rules: ['halal'] }))).length, 13);
});

test('Speisevorschriften: Vorschläge wie vereinbart, jeder Punkt wirkt erst einzeln bestätigt', () => {
  const suggest = Object.fromEntries(dietQuestion.rules.map((rule) => [rule.id, rule.suggest]));
  assert.deepEqual(suggest.halal, ['animalOrigin:pork', 'animalOrigin:gelatin', 'food:Alkohol']);
  assert.deepEqual(suggest.kosher, ['animalOrigin:pork', 'animalOrigin:gelatin', 'animalOrigin:seafood']);
  const confirmed = derive(withDiet({ form: 'none', rules: ['kosher'], exclusions: ['animalOrigin:pork'] }));
  assert.deepEqual(confirmed.exclusions.map(({ value }) => value), ['pork']);
  assert.deepEqual(confirmed.dietaryRules, ['kosher']);
});

test('Fleisch unbekannter Art fällt weg, sobald irgendeine Fleischart ausgeschlossen ist', () => {
  const unknown = { id: 'X1', stage: 4, children: [], allergens: [], animalOrigin: ['meat'] };
  assert.equal(hasUnknownMeat(unknown), true);
  assert.equal(hasUnknownMeat(index.get('D02')), false, 'Gerichte im Katalog tragen ihre Fleischart');
  assert.ok(isAllowed(unknown, buildExclusions([])));
  assert.ok(!isAllowed(unknown, buildExclusions([{ type: 'animalOrigin', value: 'poultry' }])));
  assert.ok(isAllowed(unknown, buildExclusions([{ type: 'animalOrigin', value: 'fish' }])), 'Fisch betrifft kein Fleisch');
  assert.deepEqual(catalog.cards.filter(hasUnknownMeat).map((card) => card.id), [], 'heute hat keine Karte Fleisch unbekannter Art');
});

test('Frühere Antworten: „Kein Schweinefleisch“ wird zu „keine besondere“ mit Einzelausschlüssen', () => {
  assert.deepEqual(dietAnswer('no_pork'), { form: 'none', exclusions: ['animalOrigin:pork', 'animalOrigin:gelatin'], rules: [] });
  assert.deepEqual(dietAnswer('no_fish'), { form: 'none', exclusions: ['animalOrigin:fish', 'animalOrigin:seafood'], rules: [] });
  assert.deepEqual(dietAnswer('vegetarian'), { form: 'vegetarian', exclusions: [], rules: [] });
  assert.equal(isAnswered(dietQuestion, 'none'), true);
  const legacy = derive({ ...empty, diet: 'no_pork' });
  assert.equal(legacy.diet, 'none');
  assert.deepEqual(legacy.exclusions.map(({ value }) => value), ['pork', 'gelatin']);
});

test('Frage 3 und Teil B führen auf dieselbe Ausschluss-ID und dieselben Karten', () => {
  assert.equal(canonicalKey(index, 'card:F01.3'), 'animalOrigin:pork');
  assert.equal(canonicalKey(index, 'card:F01.2'), 'animalOrigin:beef');
  assert.equal(canonicalKey(index, 'card:F05.4'), 'card:F05.4');
  assert.equal(keyLabel(null, index, 'animalOrigin:pork'), 'Schweinefleisch');
  const viaSearch = withDiet({ form: 'none' }, { never: { ...empty.never, gate: 'yes', selected: ['card:F01.3'] } });
  const viaQ1 = withDiet({ form: 'none', exclusions: ['animalOrigin:pork'] });
  assert.deepEqual(visibleIds(viaSearch), visibleIds(viaQ1));
  assert.deepEqual(derive(viaSearch).exclusions.map(({ type, value }) => [type, value]), [['animalOrigin', 'pork']]);
  // Schon in Frage 1 ausgeschlossen: Frage 3 bietet Schweinefleisch nicht mehr an
  assert.equal(createRedundancyCheck(definition, viaQ1, { allergens, catalogIndex: index, upTo: 1 }).key('card:F01.3'), true);
});

test('Chips „Schweinefleisch“ und „Rindfleisch“ in Frage 3 entfallen', () => {
  const never = definition.questions.find((question) => question.id === 'never');
  const keys = never.quickPicks.map((pick) => pick.key);
  assert.ok(!keys.includes('card:F01.3') && !keys.includes('card:F01.2'));
});

test('Hinweise nennen die Restriktion beim Namen („Ohne Rindfleisch“), auch ohne eigene Wörter', () => {
  const exclusions = buildExclusions([{ type: 'animalOrigin', value: 'beef' }]);
  assert.deepEqual(annotateCard(index.get('F01'), index, exclusions).notes, ['Ohne Rindfleisch']);
});

test('Zusammenfassung: Einzelausschlüsse bei der Ernährungsweise, Speisevorschrift als Angabe ohne Wirkung', async () => {
  const { summarySections } = await import('./profile.js');
  const answers = withDiet({ form: 'none', exclusions: ['animalOrigin:pork'], rules: ['halal'] });
  const onboarding = derive(answers);
  const [diet, intolerances, never] = summarySections(stateFor(answers), { onboarding, diets: definition.diets, allergens, index, dietRules: dietQuestion.rules });
  assert.deepEqual(diet.items.map((item) => item.label), ['Kein Schweinefleisch']);
  assert.deepEqual(diet.dietaryRules, ['Halal']);
  assert.deepEqual([...intolerances.items, ...never.items], []);
});

test('„Kein Alkohol“ aus Frage 1 wird in Frage 3 nicht noch einmal angeboten', () => {
  const answers = withDiet({ form: 'none', exclusions: ['food:Alkohol'] });
  assert.equal(createRedundancyCheck(definition, answers, { allergens, catalogIndex: index, upTo: 1 }).key('food:Alkohol'), true);
  assert.equal(createRedundancyCheck(definition, withDiet({ form: 'none' }), { allergens, catalogIndex: index, upTo: 1 }).key('food:Alkohol'), false);
});
