import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexCatalog } from './catalog.js';
import { computeProfile, deriveRoundState, selectNextCards, tasteSignals } from './engine.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNDO, UNFAMILIAR } from './answers.js';
import { DIET_CHANGED, EXCLUSION_ADDED, EXCLUSION_REMOVED, RATING_CHANGED } from './events.js';
import { isAllowed, isVisible } from './filter.js';
import { groupExclusions } from './profile.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const allergens = read('../data/allergens.json');
const { diets } = read('../data/stage0.json');

const swipe = (cardId, response, extra = {}) => ({ type: 'ANSWER', cardId, response, ...extra });
const rate = (cardId, rating, previousRating) => ({ type: RATING_CHANGED, source: 'profile', cardId, rating, previousRating });
const add = (section, ...exclusions) => ({ type: EXCLUSION_ADDED, source: 'profile', section, exclusions });
const remove = (section, ...exclusions) => ({ type: EXCLUSION_REMOVED, source: 'profile', section, exclusions });
const diet = (value, previous = null) => ({ type: DIET_CHANGED, source: 'profile', diet: value, previousDiet: previous });

const hazelnutAllergy = { diet: null, cardLabels: {}, exclusions: [{ type: 'allergen', value: 'hazelnut', source: 'onboarding', origin: 'intolerances', label: 'Haselnuss' }] };
const none = { diet: null, exclusions: [], cardLabels: {} };
const state = (events, onboarding = none) => deriveRoundState({ index, onboarding, diets, events });
const visible = (current, id) => isVisible(index.get(id), index, current.exclusions);

test('Rating-Änderung im Profil ist ein eigenes Ereignis; die ursprüngliche Swipe-Antwort bleibt im Log', () => {
  const original = swipe('F01', LIKE, { inputMethod: 'swipe', positionInRound: 1 });
  const log = [original, rate('F01', PREFER, LIKE)];
  const current = state(log);
  assert.equal(current.answers.F01, LIKE, 'Antwort beim Wischen unverändert');
  assert.equal(current.ratings.F01, PREFER, 'letzte direkte Antwort');
  assert.deepEqual(log[0], swipe('F01', LIKE, { inputMethod: 'swipe', positionInRound: 1 }), 'Ereignis nicht überschrieben');
  const profile = computeProfile(current);
  assert.deepEqual(profile.groups.PREFER, ['F01']);
  assert.deepEqual(profile.groups.LIKE, []);
  assert.deepEqual(tasteSignals(current), [{ cardId: 'F01', response: PREFER }]);
});

test('„Entfernen“ nimmt einen Eintrag aus dem Profil, ohne die Runde zu verändern', () => {
  const current = state([swipe('F01', LIKE), swipe('F02', UNFAMILIAR), rate('F01', null, LIKE)]);
  const profile = computeProfile(current);
  assert.deepEqual(profile.removed, ['F01']);
  assert.ok(!Object.values(profile.groups).flat().includes('F01'));
  assert.deepEqual(current.sequence, ['F01', 'F02'], 'die Runde zählt die Karte weiter als beantwortet');
  // Kennst du nicht → später bewertet
  const later = state([swipe('F02', UNFAMILIAR), rate('F02', LIKE, UNFAMILIAR)]);
  assert.deepEqual(computeProfile(later).groups.LIKE, ['F02']);
  assert.deepEqual(computeProfile(later).groups.UNFAMILIAR, []);
});

test('Entfernen einer Allergie macht die Karten wieder sichtbar (über isAllowed)', () => {
  const hazelnut = index.cards.find((card) => card.allergens.includes('hazelnut'));
  const before = state([], hazelnutAllergy);
  assert.equal(isAllowed(hazelnut, before.exclusions), false);
  const after = state([remove('allergies', { type: 'allergen', value: 'hazelnut' })], hazelnutAllergy);
  assert.equal(isAllowed(hazelnut, after.exclusions), true);
  assert.equal(visible(after, hazelnut.id), true);
  assert.deepEqual(after.entries, []);
  // Wieder hinzufügen schliesst sie erneut aus
  const again = state([remove('allergies', { type: 'allergen', value: 'hazelnut' }), add('allergies', { type: 'allergen', value: 'hazelnut', label: 'Haselnuss' })], hazelnutAllergy);
  assert.equal(isAllowed(hazelnut, again.exclusions), false);
  assert.equal(again.entries[0].source, 'profile');
});

test('Entfernen von „Vertrage ich nicht“ aus dem Wischen macht die Karten wieder sichtbar', () => {
  const log = [swipe('F13', INTOLERANT, { excludedCardIds: ['F13.1.1'] })];
  assert.equal(visible(state(log), 'F13.1.1'), false);
  const current = state([...log, remove('intolerances', { type: 'card', value: 'F13.1.1' })]);
  assert.equal(visible(current, 'F13.1.1'), true);
  assert.equal(current.answers.F13, INTOLERANT, 'die Antwort beim Wischen bleibt im Log und zählt fürs Limit');
});

test('Replay nach Profiländerungen: Reihenfolge zählt, Rückgängig und Ernährungsweise eingeschlossen', () => {
  const log = [
    swipe('F01', LIKE),
    swipe('F02', DISLIKE),
    rate('F02', PREFER, DISLIKE),
    swipe('F03', LIKE),
    rate('F03', DISLIKE, LIKE),
    swipe('F03', UNDO), // nimmt F03 zurück, auch die spätere Änderung gilt nicht mehr
    add('never', { type: 'card', value: 'F05.4', label: 'Tofu und Soja' }),
    diet('vegetarian', null),
    swipe('F04', PREFER),
  ];
  const current = state(log);
  assert.deepEqual(current.sequence, ['F01', 'F02', 'F04']);
  assert.deepEqual(current.ratings, { F01: LIKE, F02: PREFER, F04: PREFER });
  assert.equal(current.diet, 'vegetarian');
  assert.equal(visible(current, 'F01'), false, 'vegetarisch: Fleisch fällt weg');
  assert.equal(visible(current, 'F05.4'), false, 'Tofu und Soja ausgeschlossen');
  assert.equal(visible(current, 'F05'), true, 'die Familie Hülsenfrüchte bleibt');
  assert.ok(!selectNextCards(current, { roundCardLimit: 30 }).some((card) => card.id === 'F02'), 'beantwortete Karten kommen nicht wieder');
  // Gleiche Ereignisse ergeben immer denselben Zustand
  assert.deepEqual(state(log), current);
  // Wiederholt beantwortet: Ältere Profiländerungen gelten nicht für die neue Antwort
  const redone = state([...log, swipe('F03', LIKE)]);
  assert.equal(redone.ratings.F03, LIKE);
  // Hinzufügen nach dem Entfernen zählt, Entfernen nach dem Hinzufügen auch
  const toggled = state([add('never', { type: 'card', value: 'F05.4' }), remove('never', { type: 'card', value: 'F05.4' })]);
  assert.equal(visible(toggled, 'F05.4'), true);
});

test('Nur Profiländerungen mit source "profile" verändern das Profil', () => {
  const foreign = { ...diet('vegan'), source: 'import' };
  assert.equal(state([foreign]).diet, null);
});

test('Ausschlüsse im Profil: Abschnitte und Herkunft (Onboarding, Wischen, Profil)', () => {
  const onboarding = {
    diet: null,
    cardLabels: {},
    exclusions: [
      { type: 'allergen', value: 'hazelnut', source: 'onboarding', origin: 'intolerances', label: 'Haselnuss' },
      { type: 'card', value: 'F01.3', source: 'onboarding', origin: 'never', label: 'Schweinefleisch' },
      { type: 'food', value: 'Koriander', source: 'onboarding', origin: 'never', label: 'Koriander', freeText: true },
    ],
  };
  const current = state(
    [swipe('F02', INTOLERANT, { excludedCardIds: ['F02.2'] }), add('intolerances', { type: 'allergen', value: 'lactose', label: 'Laktose' }), add('allergies', { type: 'allergen', value: 'almond', label: 'Mandel' })],
    onboarding
  );
  const sections = groupExclusions(current.entries, { allergens, index });
  assert.deepEqual(sections.allergies.map((item) => [item.label, item.sources]), [['Haselnuss', ['onboarding']], ['Mandel', ['profile']]]);
  assert.deepEqual(sections.intolerances.map((item) => [item.label, item.sources]), [['Krebstiere', ['swipe']], ['Laktose', ['profile']]]);
  assert.deepEqual(sections.never.map((item) => item.label), ['Schweinefleisch']);
  assert.deepEqual(sections.notes.map((item) => item.label), ['Koriander']);
});
