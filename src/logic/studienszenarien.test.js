// Systematischer Testplan vor der Nutzerstudie (docs/06_Testkonzept_und_Ergebnisse.md). Jeder Test trägt die
// Test-ID aus der Dokumentation. Alles ist deterministisch: Kontrollkarten kommen aus der sessionId
// (seededRandom), Zeitstempel aus einer festen Uhr (src/test/simulate.js).
//
// Tests mit „Ist-Zustand“ im Namen dokumentieren das heutige Verhalten, zu dem ein Teamentscheid aussteht
// (docs/08_Anwendungslogik_Bewertung.md). Sie behaupten nicht, dass dieses Verhalten richtig ist.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG, MAX_ROUNDS, NEGATIVE_GROUP_QUOTA_STAGE3, ROUND_CARD_LIMIT } from '../config.js';
import { indexCatalog } from './catalog.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNDO, UNFAMILIAR } from './answers.js';
import { buildProfile, deriveRoundState, dishAffinity, eligibleFamilies, hasMoreCards, nextCard, nextRoundNumber, openDishes, openHoldout, presentCard, selectNextCards } from './engine.js';
import { PHASE_HOLDOUT, PHASE_MAIN } from './events.js';
import { isVisible } from './filter.js';
import { drawHoldout } from './holdout.js';
import { buildDashboard, profileProgress } from './dashboard.js';
import { rankedStageCards, REASONS, SELECTION } from './selection.js';
import { roundOverview } from './rounds.js';
import { NO_ONBOARDING, simulateSession, tasteByFamily } from '../test/simulate.js';
import { onboardingFor, play, playScenario, respondById, SZENARIEN } from '../test/szenarien.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const catalog = read('../data/catalog.json');
const stage0 = read('../data/stage0.json');
const allergens = read('../data/allergens.json');
const cuisines = read('../data/cuisines.json').cuisines;
const index = indexCatalog(catalog.cards);
const { diets } = stage0;
const data = { index, stage0, allergens, cuisines };
const config = { ...DEFAULT_CONFIG }; // Limit 13, adaptiv, 6 Kontrollkarten (wie die App ohne URL-Parameter)

const onboarding = (spec) => onboardingFor(data, spec);
const state = (events, ob = NO_ONBOARDING, round = 1) => deriveRoundState({ index, onboarding: ob, diets, events, round });
const answers = (session) => session.events.filter((event) => event.type === 'ANSWER');
const inRound = (session, round) => answers(session).filter((event) => event.round === round);
const ids = (list) => list.map((entry) => entry.cardId ?? entry.id);
const familyOf = (id) => {
  let card = index.get(id);
  while (card.parentId) card = index.get(card.parentId);
  return card.id;
};
const tagsOf = (id) => [...index.get(id).allergens, ...index.get(id).animalOrigin];
const assertNoTag = (session, tags, label) => {
  for (const event of answers(session)) assert.ok(!tagsOf(event.cardId).some((tag) => tags.includes(tag)), `${label}: ${event.cardId} trägt ${tagsOf(event.cardId).join(',')}`);
};

// ---------- T01 bis T05: Nutzung ohne und mit Einschränkungen ----------

test('T01 Normale Nutzung ohne Einschränkungen: vier Runden, je Runde eine Ebene, Runden 1 bis 3 höchstens 13 Karten, Runde 4 alle passenden Gerichte, keine doppelt', () => {
  const session = simulateSession({ index, diets, config, respond: () => LIKE, sessionId: 'T01' });
  const all = answers(session);
  assert.equal(new Set(ids(all)).size, all.length, 'keine Karte doppelt');
  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    const cards = inRound(session, round);
    assert.ok(cards.length > 0 && (round === 4 || cards.length <= ROUND_CARD_LIMIT), `Runde ${round}: ${cards.length} Karten`);
    assert.ok(cards.every((event) => event.stage === round), `Runde ${round} bleibt auf Ebene ${round}`);
  }
  assert.equal(inRound(session, 1).length, 13, 'alle 13 Gruppen in Runde 1');
  assert.deepEqual(inRound(session, 2).slice(-6).map((event) => event.phase), Array(6).fill(PHASE_HOLDOUT), 'sechs Kontrollkarten am Ende von Runde 2');
  assert.equal(inRound(session, 2).filter((event) => event.phase === PHASE_MAIN).length, 7, 'Runde 2: 7 normale Karten plus 6 Kontrollkarten');
  assert.equal(inRound(session, 4).length, 22, 'Runde 4 ohne Limit (28.10.2026): alle 22 Gerichte, weil nichts abgelehnt wurde');
});

test('T02 Eine Allergie (Haselnuss): keine Karte mit Haselnuss, Nüsse bleiben mit Hinweis, Birchermüesli fällt weg', () => {
  const hazelnut = onboarding({ allergenIds: ['hazelnut'] });
  const session = simulateSession({ index, diets, config, respond: () => LIKE, sessionId: 'T02', onboarding: hazelnut });
  assertNoTag(session, ['hazelnut'], 'T02');
  assert.ok(ids(answers(session)).includes('F13'), 'Nüsse und Samen werden gefragt');
  assert.deepEqual(presentCard(state([], hazelnut), index.get('F13')).notes, ['Ohne Haselnüsse']);
  assert.ok(!ids(answers(session)).includes('D17'), 'Birchermüesli (Haselnuss) kommt nie');
  const fourth = state([], hazelnut, 4);
  assert.equal(openDishes(fourth).length, 21, 'genau ein Gericht fällt weg');
});

test('T03 Mehrere Ausschlüsse (Laktose, alles mit Gluten, Eier): konsequent in allen Runden, nur drei Gerichte', () => {
  const tags = ['lactose', 'wheat', 'spelt', 'rye', 'barley', 'oats', 'egg'];
  const multi = onboarding({ allergenIds: tags });
  const session = simulateSession({ index, diets, config, respond: () => LIKE, sessionId: 'T03', onboarding: multi });
  assertNoTag(session, tags, 'T03');
  assert.equal(inRound(session, 1).length, 10, 'Eier, Brot und Pasta entfallen als Gruppen');
  assert.deepEqual(ids(inRound(session, 4)).sort(), ['D11', 'D15', 'D22'], 'Chili con Carne, Gemüsecurry, Ratatouille');
  assert.equal(hasMoreCards(state(session.events, multi, 4), config), false);
});

test('T04 Vegetarisch und vegan: keine Karte mit Fleisch oder Fisch; vegan auch ohne Milch, Ei, Honig', () => {
  const vegetarian = onboarding({ form: 'vegetarian' });
  const veg = simulateSession({ index, diets, config, respond: () => LIKE, sessionId: 'T04v', onboarding: vegetarian });
  assertNoTag(veg, ['meat', 'pork', 'beef', 'poultry', 'fish', 'seafood', 'gelatin'], 'vegetarisch');
  assert.equal(inRound(veg, 1).length, 11);
  assert.equal(inRound(veg, 4).length, 12, 'alle 12 vegetarischen Gerichte, weniger als das Limit');
  const vegan = onboarding({ form: 'vegan' });
  const vg = simulateSession({ index, diets, config, respond: () => LIKE, sessionId: 'T04vg', onboarding: vegan });
  assertNoTag(vg, ['meat', 'pork', 'beef', 'poultry', 'fish', 'seafood', 'dairy', 'egg', 'honey', 'gelatin'], 'vegan');
  assert.equal(inRound(vg, 1).length, 9);
  assert.deepEqual(ids(inRound(vg, 4)).sort(), ['D15', 'D18', 'D20', 'D22']);
});

test('T05 Speisevorschrift halal: ohne Bestätigung keine Wirkung; bestätigte Vorschläge wirken wie Einzelausschlüsse', () => {
  const unconfirmed = onboarding({ rules: ['halal'] });
  assert.deepEqual(unconfirmed.dietaryRules, ['halal']);
  assert.deepEqual(unconfirmed.exclusions, []);
  assert.equal(eligibleFamilies(state([], unconfirmed)).length, 13);
  const confirmed = onboarding({ rules: ['halal'], dietExclusions: ['animalOrigin:pork', 'animalOrigin:gelatin', 'food:Alkohol'] });
  assert.deepEqual(confirmed.exclusions.map(({ type, value }) => `${type}:${value}`), ['animalOrigin:pork', 'animalOrigin:gelatin', 'food:Alkohol']);
  const session = simulateSession({ index, diets, config, respond: () => LIKE, sessionId: 'T05', onboarding: confirmed });
  assertNoTag(session, ['pork', 'gelatin'], 'halal bestätigt');
  const shownDishes = ids(inRound(session, 4));
  for (const id of ['D02', 'D03', 'D06', 'D07', 'D09', 'D10']) assert.ok(!shownDishes.includes(id), `${id} (Schwein oder Alkohol) kommt nicht`);
  assert.ok(ids(answers(session)).includes('F01'), 'Fleisch und Geflügel bleibt als Gruppe (ohne Schwein)');
  assert.doesNotMatch(JSON.stringify(confirmed), /religi/i, 'keine Religionsangabe im Ergebnis');
});

// ---------- T06 bis T09: Antwortmuster ----------

test('T06 Überwiegend positiv: Runde 2 nur Kontrastpaare und Kontrollkarten, Runde 3 höchstens zwei Lebensmittel je Untergruppe', () => {
  const session = simulateSession({ index, diets, config, respond: () => LIKE, sessionId: 'T06' });
  const second = inRound(session, 2).filter((event) => event.phase === PHASE_MAIN);
  assert.ok(second.every((event) => event.selectionReason === REASONS.CONTRAST), 'nur Kontrastkarten');
  const third = inRound(session, 3);
  assert.ok(third.every((event) => event.selectionReason === REASONS.DETAIL), 'nur stage3_detail');
  const perParent = Object.groupBy(third, (event) => event.parentId);
  assert.ok(Object.values(perParent).every((list) => list.length <= 2));
  assert.equal(profileProgress(state(session.events)).points.stage1, 35, 'alle zulässigen Gruppen mit Geschmacksantwort');
});

test('T07 Überwiegend negativ: eine Ausnahme je Gruppe, negative Zweige ganz am Schluss, nichts wird ausgeschlossen', () => {
  const session = simulateSession({ index, diets, config, respond: () => DISLIKE, sessionId: 'T07' });
  const second = inRound(session, 2).filter((event) => event.phase === PHASE_MAIN);
  assert.ok(second.every((event) => [REASONS.EXCEPTION, REASONS.AFTER_NEGATIVE].includes(event.selectionReason)));
  const exceptions = second.filter((event) => event.selectionReason === REASONS.EXCEPTION);
  assert.equal(new Set(exceptions.map((event) => event.parentId)).size, exceptions.length, 'höchstens eine Ausnahme je Gruppe');
  const third = inRound(session, 3);
  assert.ok(third.every((event) => event.selectionReason === REASONS.AFTER_NEGATIVE_DETAIL));
  assert.ok(Object.values(Object.groupBy(third, (event) => event.parentId)).every((list) => list.length <= NEGATIVE_GROUP_QUOTA_STAGE3));
  // Runde 4 (28.10.2026): nur Gerichte, die zum Profil passen. Wer alle Gruppen ablehnt, bekommt kein Gericht; die Sitzung endet nach Runde 3
  assert.equal(inRound(session, 4).length, 0, 'kein passendes Gericht');
  assert.equal(nextRoundNumber(state(session.events, NO_ONBOARDING, 3), config), null, 'Runde 4 entfällt');
  const final = state(session.events, NO_ONBOARDING, 4);
  assert.equal(eligibleFamilies(final).length, 13, '„Mag ich nicht“ schliesst keine Gruppe aus');
  assert.deepEqual(buildProfile(final).intolerant, []);
});

test('T08 Viele unbekannte Lebensmittel: höchstens zwei Klärungskarten je Gruppe in Runde 2, kein Profilstand ohne Geschmacksantwort', () => {
  const session = simulateSession({ index, diets, config, respond: () => UNFAMILIAR, sessionId: 'T08' });
  const second = inRound(session, 2).filter((event) => event.phase === PHASE_MAIN);
  assert.ok(second.every((event) => event.selectionReason === REASONS.AFTER_UNFAMILIAR));
  assert.ok(Object.values(Object.groupBy(second, (event) => event.parentId)).every((list) => list.length <= 2));
  const final = state(session.events, NO_ONBOARDING, 4);
  assert.equal(profileProgress(final).percent, 0, '„Kenne ich nicht“ gibt keine Punkte');
  const profile = buildProfile(final);
  assert.deepEqual([profile.taste.LIKE, profile.taste.DISLIKE, profile.taste.PREFER], [[], [], []]);
  assert.equal(profile.unfamiliar.length, answers(session).length);
  assert.deepEqual(buildDashboard(final).dishes, [], 'unbekannte Gerichte zählen nicht als Geschmack');
});

test('T09 Verschiedene Antworten in aufeinanderfolgenden Runden: Kontrast verschieden → Präzisierung; gleich → Zweig geklärt', () => {
  const families = index.cards.filter((card) => card.stage === 1).map((card) => ({ cardId: card.id, response: LIKE, round: 1 }));
  const noHoldout = { ...config, holdout: 0 };
  // Obst: Beeren „Mag ich sehr“, Zitrusfrüchte „Mag ich nicht“ → Erdbeeren und Orangen in Runde 3, übrige Untergruppen in Runde 2
  const differs = [...families, { cardId: 'F12.1', response: PREFER, round: 2 }, { cardId: 'F12.4', response: DISLIKE, round: 2 }];
  const secondOpen = rankedStageCards(state(differs, NO_ONBOARDING, 2), SELECTION.ADAPTIVE, 2).filter((entry) => entry.card.parentId === 'F12');
  assert.deepEqual(secondOpen.map((entry) => [entry.card.id, entry.reason]), [['F12.2', REASONS.DIFFERENCE], ['F12.3', REASONS.DIFFERENCE], ['F12.5', REASONS.DIFFERENCE]]);
  const thirdOpen = rankedStageCards(state(differs, NO_ONBOARDING, 3), SELECTION.ADAPTIVE, 3).filter((entry) => entry.card.id.startsWith('F12.'));
  assert.deepEqual(thirdOpen.slice(0, 2).map((entry) => [entry.card.id, entry.reason]), [['F12.1.1', REASONS.DIFFERENCE_DETAIL], ['F12.4.1', REASONS.DIFFERENCE_DETAIL]]);
  // Gleich beantwortet: keine weitere Untergruppe aus Obst, nur noch Lebensmittel der beiden bewerteten Untergruppen
  const same = [...families, { cardId: 'F12.1', response: LIKE, round: 2 }, { cardId: 'F12.4', response: LIKE, round: 2 }];
  assert.deepEqual(rankedStageCards(state(same, NO_ONBOARDING, 2), SELECTION.ADAPTIVE, 2).filter((entry) => entry.card.parentId === 'F12'), []);
  const thirdSame = rankedStageCards(state(same, NO_ONBOARDING, 3), SELECTION.ADAPTIVE, 3).filter((entry) => entry.card.id.startsWith('F12.'));
  assert.ok(thirdSame.every((entry) => ['F12.1', 'F12.4'].includes(entry.card.parentId) && entry.reason === REASONS.DETAIL));
  assert.equal(nextCard(state(same, NO_ONBOARDING, 2), noHoldout).stage, 2);
});

// ---------- T10 bis T13: Grenzfälle, Wiederholbarkeit, Konsistenz ----------

test('T10 Stark eingeschränkte Gerichte: zwei Gerichte bei vegan und Gluten, null Gerichte → Runde 4 entfällt', () => {
  const veganGluten = onboarding({ form: 'vegan', allergenIds: ['wheat', 'spelt', 'rye', 'barley', 'oats'] });
  assert.deepEqual(openDishes(state([], veganGluten, 4)).map((card) => card.id), ['D15', 'D22']);
  const none = onboarding({ form: 'vegan', allergenIds: ['celery', 'wheat', 'soy'], neverKeys: ['card:F11.3'] });
  assert.deepEqual(openDishes(state([], none, 4)), [], 'kein Gericht übrig');
  const session = simulateSession({ index, diets, config, respond: () => LIKE, sessionId: 'T10', onboarding: none });
  assert.equal(Math.max(...answers(session).map((event) => event.round)), 3, 'die Sitzung endet nach Runde 3');
  assert.equal(nextRoundNumber(state(session.events, none, 3), config), null);
  const rounds = roundOverview({ index, onboarding: none, diets, events: session.events, config });
  assert.deepEqual(rounds.map((entry) => entry.status), ['completed', 'completed', 'completed', 'completed']);
  assert.equal(rounds[3].empty, true, 'Runde 4: „Keine passenden Karten nach deinen Angaben“');
});

test('T11 Wiederholte Durchläufe mit identischen Eingaben ergeben identische Karten, Kontrollkarten und Profile', () => {
  // tasteByFamily braucht eine Antwort für jede Gruppe (sonst gäbe es Antworten ohne Wert, die nie zählen)
  const byFamily = Object.fromEntries(index.cards.filter((card) => card.stage === 1).map((card) => [card.id, { F01: PREFER, F02: DISLIKE, F05: UNFAMILIAR, F12: PREFER }[card.id] ?? LIKE]));
  const run = () => simulateSession({ index, diets, config, respond: tasteByFamily(index, byFamily, { 'F12.1': DISLIKE }), sessionId: 'T11' });
  const first = run();
  const second = run();
  assert.deepEqual(second.events, first.events);
  assert.deepEqual(buildProfile(state(second.events, NO_ONBOARDING, 4)), buildProfile(state(first.events, NO_ONBOARDING, 4)));
  for (const scenario of SZENARIEN) assert.deepEqual(playScenario(scenario, data).events, playScenario(scenario, data).events, scenario.id);
  // Andere sessionId: andere Kontrollkarten, gleiche Runde 1
  const other = simulateSession({ index, diets, config, respond: () => LIKE, sessionId: 'T11-andere' });
  assert.notDeepEqual(other.events[0].cardIds, first.events[0].cardIds);
  assert.deepEqual(ids(inRound(other, 1)), ids(inRound(first, 1)));
});

test('T12 Profilberechnung ist konsistent: jede Antwort landet genau einmal, der Profilstand sinkt nie, nichts über 100 %', () => {
  const result = playScenario(SZENARIEN[0], data);
  const final = result.final;
  const profile = result.profile;
  const placed = [...Object.values(profile.taste).flat(), ...profile.unfamiliar, ...profile.intolerant];
  assert.deepEqual([...placed].sort(), [...final.sequence].sort(), 'jede Antwort genau einmal im Profil');
  assert.equal(result.dashboard.summary.total, final.sequence.length - profile.intolerant.length, 'INTOLERANT zählt nicht als Antwortkategorie');
  let previous = 0;
  const events = [];
  for (const event of result.events) {
    events.push(event);
    const { percent } = profileProgress(state(events, final.onboarding, 4));
    assert.ok(percent >= previous && percent <= 100, `${event.cardId ?? event.type}: ${previous} → ${percent}`);
    previous = percent;
  }
  assert.ok(result.derived.every((entry) => !(entry.cardId in final.answers)), 'Vermutungen nie für beantwortete Karten');
});

test('T13 Grenzfall: alle Gruppen in Frage 3 ausgeschlossen → keine Karte in keiner Runde', () => {
  const everything = onboarding({ neverKeys: index.cards.filter((card) => card.stage === 1).map((card) => `card:${card.id}`) });
  assert.equal(eligibleFamilies(state([], everything)).length, 0);
  for (let round = 1; round <= MAX_ROUNDS; round += 1) assert.deepEqual(selectNextCards(state([], everything, round), config), [], `Runde ${round}`);
  assert.equal(hasMoreCards(state([], everything), config), false);
  assert.deepEqual(drawHoldout(state([], everything), { count: 6, seed: 'T13' }).cardIds, []);
});

// ---------- T14 bis T18: Wirkung einzelner Entscheidungen auf spätere Runden ----------

test('T14 „Vertrage ich nicht“ beim Wischen wirkt in allen späteren Runden, auch auf Gerichte mit dieser Zutat', () => {
  const session = simulateSession({ index, diets, config, respond: (card) => (card.id === 'F02' ? INTOLERANT : LIKE), sessionId: 'T14' });
  const fish = answers(session).find((event) => event.cardId === 'F02');
  assert.deepEqual([fish.response, fish.excludedCardIds], [INTOLERANT, ['F02']]);
  assert.ok(!answers(session).some((event) => event.cardId !== 'F02' && familyOf(event.cardId) === 'F02'), 'keine Untergruppe oder Sorte aus Fisch');
  for (const id of ['D13', 'D19']) assert.ok(!ids(inRound(session, 4)).includes(id), `${id} hat Fisch oder Crevetten als Zutat`);
  // Teilweise: nur Haselnüsse → Haselnüsse weg, die übrigen Nüsse stehen für Runde 2 an (stage2_after_intolerant)
  const partial = play({ ...data, onboarding: NO_ONBOARDING, sessionId: 'T14b', config, respond: (card) => (card.id === 'F13' ? { response: INTOLERANT, excludedCardIds: ['F13.1.1'] } : { response: LIKE }) });
  const afterFirst = state(partial.events.filter((event) => event.type !== 'ANSWER' || event.round === 1), NO_ONBOARDING, 2);
  assert.equal(isVisible(index.get('F13.1.1'), index, afterFirst.exclusions), false, 'Haselnüsse ausgeschlossen');
  assert.equal(isVisible(index.get('F13.1'), index, afterFirst.exclusions), true, 'Baumnüsse bleiben');
  const nuts = rankedStageCards(afterFirst, SELECTION.ADAPTIVE, 2).filter((entry) => entry.card.parentId === 'F13');
  assert.deepEqual(nuts.map((entry) => [entry.card.id, entry.reason]), [['F13.1', REASONS.AFTER_INTOLERANT], ['F13.2', REASONS.AFTER_INTOLERANT]]);
});

test('T15 Ist-Zustand (Befund B1): „Vertrage ich nicht“ wirkt über die Karten-ID, nicht über Allergen-Tags', () => {
  // Onboarding „Eier“ (Tag egg) blendet Zopf, Bandnudeln und Lasagne aus. „Vertrage ich nicht“ auf der Karte Eier (F03)
  // schliesst nur F03 und Gerichte mit F03 als verknüpfter Zutat aus. Entscheid des Teams offen, siehe Doku.
  const viaOnboarding = state([], onboarding({ allergenIds: ['egg'] }), 4);
  const viaSwipe = state([{ cardId: 'F03', response: INTOLERANT, round: 1, excludedCardIds: ['F03'] }], NO_ONBOARDING, 4);
  for (const id of ['F06.1.1', 'F07.1.3', 'D03', 'D12', 'D14']) {
    assert.equal(isVisible(index.get(id), index, viaOnboarding.exclusions), false, `${id} nach Onboarding-Allergen Ei verborgen`);
    assert.equal(isVisible(index.get(id), index, viaSwipe.exclusions), true, `${id} nach „Vertrage ich nicht“ auf Eier weiterhin sichtbar (Ist-Zustand)`);
  }
  assert.equal(isVisible(index.get('D05'), index, viaSwipe.exclusions), false, 'Rösti mit Spiegelei ist über die Zutat F03 verknüpft und fällt weg');
  const milk = state([{ cardId: 'F04', response: INTOLERANT, round: 1, excludedCardIds: ['F04'] }], NO_ONBOARDING, 4);
  assert.equal(openDishes(milk).length, 14, 'Milchprodukte beim Wischen: 14 Gerichte, davon 7 mit Milch-Tag (Butter, Rahm)');
  assert.equal(openDishes(state([], onboarding({ allergenIds: ['lactose'] }), 4)).length, 7, 'Laktose im Onboarding: 7 Gerichte');
});

test('T16 Negative Gruppe ist kein Ausschluss (Kürbis-Beispiel): Untergruppen und Lebensmittel bleiben erreichbar', () => {
  const families = index.cards.filter((card) => card.stage === 1).map((card) => ({ cardId: card.id, response: card.id === 'F11' ? DISLIKE : LIKE, round: 1 }));
  const second = rankedStageCards(state(families, NO_ONBOARDING, 2), SELECTION.ADAPTIVE, 2).filter((entry) => entry.card.parentId === 'F11');
  assert.deepEqual(second.map((entry) => [entry.card.id, entry.reason]), [
    ['F11.2', REASONS.EXCEPTION],
    ['F11.1', REASONS.AFTER_NEGATIVE],
    ['F11.3', REASONS.AFTER_NEGATIVE],
    ['F11.4', REASONS.AFTER_NEGATIVE],
  ]);
  // Die Ausnahme wird in Runde 2 tatsächlich gefragt (Rang 3); die übrigen kommen nur, wenn das Limit Platz lässt
  const session = simulateSession({ index, diets, config: { ...config, holdout: 0 }, respond: (card) => (familyOf(card.id) === 'F11' && card.id !== 'F11.2' ? DISLIKE : LIKE), sessionId: 'T16' });
  const asked = answers(session).filter((event) => event.cardId !== 'F11' && familyOf(event.cardId) === 'F11');
  assert.ok(asked.some((event) => event.cardId === 'F11.2' && event.selectionReason === REASONS.EXCEPTION), 'die plausible Ausnahme (Wurzelgemüse) wird gefragt');
  const final = state(session.events, NO_ONBOARDING, 4);
  assert.equal(isVisible(index.get('F11.3.1'), index, final.exclusions), true, 'Zucchetti nie ausgeschlossen');
  assert.deepEqual(final.entries, [], 'kein Ausschluss-Eintrag durch „Mag ich nicht“');
  const third = rankedStageCards(state(families, NO_ONBOARDING, 3), SELECTION.ADAPTIVE, 3).filter((entry) => familyOf(entry.card.id) === 'F11');
  assert.ok(third.length > 0 && third.every((entry) => entry.reason === REASONS.AFTER_NEGATIVE_DETAIL), 'Runde 3: Lebensmittel der negativen Gruppe ganz am Schluss');
});

test('T17 Rückgängig: dieselbe Karte kommt wieder, „Vertrage ich nicht“ ist aufgehoben, die Runde zählt die Karte nicht', () => {
  const first = nextCard(state([]), config).id;
  const events = [{ cardId: first, response: INTOLERANT, round: 1, excludedCardIds: [first] }];
  assert.notEqual(nextCard(state(events), config).id, first);
  events.push({ cardId: first, response: UNDO, round: 1 });
  const undone = state(events);
  assert.equal(nextCard(undone, config).id, first, 'die Karte kommt wieder');
  assert.deepEqual(undone.sequence, []);
  assert.equal(isVisible(index.get(first), index, undone.exclusions), true);
  assert.deepEqual(buildProfile(undone).intolerant, []);
});

test('T18 Kontrollkarten: geschichtet gezogen, am Ende von Runde 2; wird eine vorher ausgeschlossen, fällt sie weg', () => {
  const drawn = drawHoldout(state([]), { count: 6, seed: 'T18' }).cardIds;
  assert.equal(new Set(drawn.map(familyOf)).size, 6, 'sechs verschiedene Gruppen');
  const family = familyOf(drawn[0]);
  const session = simulateSession({ index, diets, config, respond: (card) => (card.id === family ? INTOLERANT : LIKE), sessionId: 'T18' });
  const checks = inRound(session, 2).filter((event) => event.phase === PHASE_HOLDOUT);
  assert.equal(checks.length, 5, 'eine Kontrollkarte ist durch „Vertrage ich nicht“ weggefallen');
  assert.deepEqual(ids(checks), drawn.slice(1));
  assert.equal(inRound(session, 2).filter((event) => event.phase === PHASE_MAIN).length, 8, 'der frei gewordene Platz geht an eine normale Karte (8 + 5)');
  assert.deepEqual(openHoldout(state(session.events, NO_ONBOARDING, 4)), [], 'alle verbliebenen Kontrollkarten beantwortet');
});

// ---------- T19 bis T22: Gerichte, Budget, Wirkungslose Unterschiede, Klärungskette ----------

test('T19 Anzahl Gerichte: ohne Limit alle 22, bei Laktose oder Milcheiweiss genau 7, Reihenfolge nach Zutatenvorlieben, nur passende', () => {
  assert.equal(catalog.cards.filter((card) => card.stage === 4).length, 22);
  assert.equal(selectNextCards(state([], NO_ONBOARDING, 4), config).length, 22, 'Runde 4 ohne Kartenlimit (28.10.2026)');
  assert.equal(selectNextCards(state([], NO_ONBOARDING, 4), { ...config, roundCardLimit: 5 }).length, 22, 'das Limit gilt nur für Runde 1 bis 3');
  const lactose = openDishes(state([], onboarding({ allergenIds: ['lactose'] }), 4)).map((card) => card.id);
  assert.deepEqual(lactose.sort(), ['D11', 'D12', 'D15', 'D18', 'D19', 'D20', 'D22']);
  assert.deepEqual(openDishes(state([], onboarding({ allergenIds: ['milk_protein'] }), 4)).map((card) => card.id).sort(), lactose);
  assert.equal(catalog.cards.filter((card) => card.stage === 4 && card.allergens.includes('lactose')).length, 15, '15 von 22 Gerichten tragen Laktose');
  assert.equal(openDishes(state([], onboarding({ allergenIds: ['wheat', 'spelt', 'rye', 'barley', 'oats'] }), 4)).length, 8);
  assert.equal(openDishes(state([], onboarding({ form: 'vegetarian' }), 4)).length, 12);
  // Reihenfolge: Reis „Mag ich sehr“ und Fleisch „Mag ich nicht“ bringen Reisgerichte nach vorn, Fleischgerichte nach hinten
  const taste = index.cards.filter((card) => card.stage === 1).map((card) => ({ cardId: card.id, response: card.id === 'F08' ? PREFER : card.id === 'F01' ? DISLIKE : LIKE, round: 1 }));
  const ordered = openDishes(state(taste, NO_ONBOARDING, 4)).map((card) => card.id);
  assert.ok(ordered.indexOf('D15') < ordered.indexOf('D12'), 'Gemüsecurry mit Reis vor Wienerschnitzel');
  assert.ok(ordered.includes('D10') && !ordered.includes('D02'), 'Pilzrisotto bleibt, Bolognese (Fleisch überwiegt) passt nicht mehr zum Profil');
  assert.ok(ordered.every((id) => dishAffinity(state(taste, NO_ONBOARDING, 4), index.get(id)) >= 0), 'kein Gericht mit überwiegender Abneigung');
  assert.deepEqual(openDishes(state([], NO_ONBOARDING, 4)).map((card) => card.id).slice(0, 3), ['D01', 'D02', 'D03'], 'ohne Antworten Katalogreihenfolge');
});

test('T20 Budget von Runde 2: 7 normale Plätze reichen nicht für alle Kontrastpaare; Stufe 2 bleibt offen', () => {
  const session = simulateSession({ index, diets, config, respond: () => LIKE, sessionId: 'T20' });
  const afterSecond = state(session.events.filter((event) => event.type !== 'ANSWER' || event.round <= 2), NO_ONBOARDING, 2);
  const openContrast = rankedStageCards(afterSecond, SELECTION.ADAPTIVE, 2).filter((entry) => entry.reason === REASONS.CONTRAST);
  assert.ok(openContrast.length >= 8, `${openContrast.length} Kontrastkarten bleiben nach Runde 2 offen`);
  assert.equal(profileProgress(afterSecond).stage, 1, 'Stufe 2 gilt nicht als abgeschlossen');
  assert.ok(profileProgress(afterSecond).points.stage2 < 30);
});

test('T21 „Sehr gern“ und „Eher gern“ auf einer Gruppe ergeben in Runde 2 und 3 dieselben Karten; nur die Gerichte-Reihenfolge und das Modell unterscheiden sich', () => {
  const families = index.cards.filter((card) => card.stage === 1);
  const withF12 = (response) => families.map((card) => ({ cardId: card.id, response: card.id === 'F12' ? response : LIKE, round: 1 }));
  for (let round = 2; round <= 3; round += 1) {
    assert.deepEqual(
      selectNextCards(state(withF12(PREFER), NO_ONBOARDING, round), { ...config, holdout: 0 }).map((card) => card.id),
      selectNextCards(state(withF12(LIKE), NO_ONBOARDING, round), { ...config, holdout: 0 }).map((card) => card.id),
      `Runde ${round}`
    );
  }
  const like = playScenario({ ...SZENARIEN[0], respond: respondById({ F12: LIKE }, LIKE) }, data);
  const prefer = playScenario({ ...SZENARIEN[0], respond: respondById({ F12: PREFER }, LIKE) }, data);
  assert.deepEqual(prefer.rounds.slice(0, 3).map((entry) => ids(entry.cards)), like.rounds.slice(0, 3).map((entry) => ids(entry.cards)), 'Runden 1 bis 3 gleich');
  // Runde 4: Die Zutatenaffinität der Gerichte hängt am Modellwert (+2 statt +1), darum ändert sich die Reihenfolge
  assert.notDeepEqual(ids(prefer.rounds[3].cards), ids(like.rounds[3].cards), 'Gerichte-Reihenfolge unterscheidet sich');
  assert.ok(prefer.derived.find((entry) => entry.cardId === 'F12.2').score > like.derived.find((entry) => entry.cardId === 'F12.2').score, 'stärkere Vermutung');
});

test('T22 Ist-Zustand (Befund B2): nach „Kenne ich nicht“ auf Gruppe und beiden Klärungskarten kommen in Runde 3 weitere Klärungskarten', () => {
  const families = index.cards.filter((card) => card.stage === 1).map((card) => ({ cardId: card.id, response: card.id === 'F02' ? UNFAMILIAR : LIKE, round: 1 }));
  const twice = [...families, { cardId: 'F02.1', response: UNFAMILIAR, round: 2 }, { cardId: 'F02.2', response: UNFAMILIAR, round: 2 }];
  assert.ok(!rankedStageCards(state(twice, NO_ONBOARDING, 2), SELECTION.ADAPTIVE, 2).some((entry) => entry.card.parentId === 'F02'), 'Runde 2: keine dritte Klärungskarte');
  const third = rankedStageCards(state(twice, NO_ONBOARDING, 3), SELECTION.ADAPTIVE, 3).filter((entry) => familyOf(entry.card.id) === 'F02');
  assert.deepEqual(third.map((entry) => [entry.card.id, entry.reason]), [
    ['F02.1.1', REASONS.AFTER_UNFAMILIAR_DETAIL],
    ['F02.2.1', REASONS.AFTER_UNFAMILIAR_DETAIL],
    ['F02.1.2', REASONS.AFTER_UNFAMILIAR_DETAIL],
    ['F02.2.2', REASONS.AFTER_UNFAMILIAR_DETAIL],
  ]);
});

// ---------- T23: Die drei Ablaufbeispiele der Dokumentation, exakt wie protokolliert (Regeln demo-0.7) ----------

const EXPECTED = {
  A: [
    ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11', 'F12', 'F13'],
    ['F02.1', 'F05.4', 'F13.1', 'F01.1', 'F04.1', 'F06.1', 'F07.1', 'F12.4', 'F08.1', 'F06.3', 'F13.2', 'F07.2', 'F04.2'],
    ['F05.4.1', 'F13.1.1', 'F05.4.2', 'F13.1.2', 'F01.1.1', 'F02.1.1', 'F04.1.1', 'F06.1.1', 'F07.1.1', 'F08.1.1', 'F01.1.2', 'F02.1.2', 'F04.1.2'],
    ['D17', 'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D12', 'D13', 'D14', 'D15', 'D16', 'D20', 'D21', 'D22', 'D19', 'D11', 'D18'],
  ],
  B: [
    ['F03', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11', 'F12', 'F13'],
    ['F10.2', 'F05.1', 'F06.1', 'F07.1', 'F08.1', 'F11.1', 'F12.1', 'F06.3', 'F12.3', 'F11.2', 'F07.2', 'F10.1', 'F08.2'],
    ['F10.2.1', 'F10.2.2', 'F11.1.1', 'F11.1.2', 'F11.1.3', 'F05.1.1', 'F06.1.3', 'F07.1.1', 'F08.1.1', 'F12.1.1', 'F05.1.2', 'F06.3.1', 'F07.1.2'],
    ['D20', 'D22', 'D15', 'D18'],
  ],
  C: [
    ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11', 'F12', 'F13'],
    ['F01.1', 'F02.2', 'F04.2', 'F05.4', 'F07.1', 'F08.1', 'F10.2', 'F05.1', 'F11.2', 'F04.3', 'F12.1', 'F01.2', 'F06.1'],
    ['F04.2.1', 'F04.2.2', 'F06.1.1', 'F06.1.2', 'F01.1.1', 'F02.1.1', 'F05.1.1', 'F07.1.1', 'F08.1.1', 'F10.1.1', 'F11.1.1', 'F12.1.1', 'F13.1.2'],
    ['D01', 'D04', 'D08', 'D06', 'D07', 'D12', 'D13', 'D21'],
  ],
};

for (const scenario of SZENARIEN) {
  test(`T23${scenario.id} Ablaufbeispiel ${scenario.id} (${scenario.name}) läuft genau wie dokumentiert`, () => {
    const result = playScenario(scenario, data);
    assert.deepEqual(result.rounds.map((entry) => ids(entry.cards)), EXPECTED[scenario.id]);
    assert.equal(result.rounds.length, 4);
    for (const { round, cards } of result.rounds) assert.ok(cards.every((card) => index.get(card.id).stage === round));
  });
}

test('T23 Ablaufbeispiele: Kennzahlen, die in der Dokumentation stehen', () => {
  const [a, b, c] = SZENARIEN.map((scenario) => playScenario(scenario, data));
  assert.deepEqual(a.holdout, ['F12.4', 'F08.1', 'F06.3', 'F13.2', 'F07.2', 'F04.2']);
  assert.deepEqual([a.progress.percent, b.progress.percent, c.progress.percent], [81, 85, 89]);
  assert.deepEqual([a.derived.length, b.derived.length, c.derived.length], [97, 69, 102]);
  assert.deepEqual(a.dashboard.cuisines.map((entry) => [entry.id, entry.direction, entry.rated]), [['swiss', LIKE, 9], ['italian', LIKE, 5], ['asian', LIKE, 4]]);
  assert.deepEqual(c.dashboard.cuisines.map((entry) => [entry.id, entry.direction, entry.rated]), [['swiss', DISLIKE, 5]]);
  assert.deepEqual([a.rounds[3].cards.length, b.rounds[3].cards.length, c.rounds[3].cards.length], [22, 4, 8], 'Runde 4 ohne Limit, nur passende Gerichte');
  assert.deepEqual(b.dashboard.cuisines, [], 'vier Gerichte reichen für keine Küchentendenz');
  assert.deepEqual(c.profile.intolerant, ['F03']);
  assert.deepEqual(b.rounds[0].cards.find((card) => card.id === 'F06').notes, ['Ohne Zopf', 'und 2 weitere']);
  assert.deepEqual(c.rounds[0].cards.find((card) => card.id === 'F13').notes, ['Ohne Haselnüsse']);
  // Szenario C: Zopf (Ei) kommt in Runde 3 trotz „Vertrage ich nicht“ bei Eiern (Befund B1)
  assert.ok(ids(c.rounds[2].cards).includes('F06.1.1'));
});
