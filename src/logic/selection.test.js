import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_ROUNDS } from '../config.js';
import { indexCatalog } from './catalog.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNDO, UNFAMILIAR } from './answers.js';
import { buildProfile, computeProfile, deriveRoundState, derivedEntries, hasMoreCards, nextCard, nextRoundCards, openHoldout, selectionReason, selectNextCards, tasteSignals } from './engine.js';
import { HOLDOUT_DRAWN, PHASE_HOLDOUT, RATING_CHANGED } from './events.js';
import { rankedCards, REASONS, SELECTION } from './selection.js';
import { NO_ONBOARDING, simulateSession, tasteByFamily } from '../test/simulate.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const { diets } = read('../data/stage0.json');
const config = { roundCardLimit: 10, selection: SELECTION.ADAPTIVE };

const answer = (cardId, response, extra = {}) => ({ cardId, response, ...extra });
const state = (events, round = 1, onboarding = NO_ONBOARDING) => deriveRoundState({ index, onboarding, diets, events, round });
const ranked = (events) => rankedCards(state(events), SELECTION.ADAPTIVE);
const ids = (entries) => entries.map((entry) => entry.card.id);
const families = index.cards.filter((card) => card.stage === 1).map((card) => card.id);
const allFamilies = (byFamily) => families.map((id) => answer(id, byFamily[id] ?? LIKE));

test('Runde 1 beginnt mit den Gruppen in Katalogreihenfolge', () => {
  const cards = selectNextCards(state([]), config);
  assert.deepEqual(cards.map((card) => card.id), families.slice(0, 10));
  assert.equal(selectionReason(state([]), index.get('F01'), config), REASONS.FAMILY);
});

test('„Kenne ich nicht“ bei einer Gruppe: sofort ein Kind derselben Gruppe, höchstens zwei', () => {
  const unknown = [answer('F01', LIKE), answer('F02', UNFAMILIAR)];
  assert.equal(nextCard(state(unknown), config).id, 'F02.1', 'direkt danach');
  assert.equal(selectionReason(state(unknown), index.get('F02.1'), config), REASONS.AFTER_UNFAMILIAR);
  // Auch das Kind unbekannt: das zweite, danach keines mehr
  const twice = [...unknown, answer('F02.1', UNFAMILIAR)];
  assert.equal(nextCard(state(twice), config).id, 'F02.2');
  const thrice = [...twice, answer('F02.2', UNFAMILIAR)];
  assert.equal(nextCard(state(thrice), config).id, 'F03');
  assert.ok(!ids(ranked(thrice)).includes('F02.3'), 'höchstens zwei');
  // Das Kind ist bekannt und unbeliebt: keine weiteren Kinder
  assert.ok(!ids(ranked([...unknown, answer('F02.1', DISLIKE)])).some((id) => id.startsWith('F02.')));
  // Das Kind gefällt: die übrigen Kinder später zum Unterscheiden
  const liked = ranked([...unknown, answer('F02.1', LIKE)]);
  assert.equal(nextCard(state([...unknown, answer('F02.1', LIKE)]), config).id, 'F03');
  assert.deepEqual(
    liked.filter((entry) => entry.card.parentId === 'F02').map((entry) => [entry.card.id, entry.reason]),
    [
      ['F02.2', REASONS.DIFFERENTIATE],
      ['F02.3', REASONS.DIFFERENTIATE],
    ]
  );
});

test('Nach allen Gruppen: Favoriten, dann Ausnahmen, dann Unterschiede; Gruppen wechseln sich ab', () => {
  const events = allFamilies({ F01: PREFER, F12: PREFER, F02: DISLIKE, F04: DISLIKE, F05: DISLIKE });
  const order = ranked(events);
  const reasons = order.map((entry) => entry.reason);
  // Rangfolge der Gründe
  const firstIndex = (reason) => reasons.indexOf(reason);
  const lastIndex = (reason) => reasons.lastIndexOf(reason);
  assert.ok(lastIndex(REASONS.FAVORITE) < firstIndex(REASONS.EXCEPTION));
  assert.ok(lastIndex(REASONS.EXCEPTION) < firstIndex(REASONS.DIFFERENTIATE));
  assert.equal(firstIndex(REASONS.DETAIL), -1, 'Sorten erst nach einer bewerteten Untergruppe');
  // Favoriten abwechselnd aus Fleisch und Obst
  assert.deepEqual(ids(order.filter((entry) => entry.reason === REASONS.FAVORITE)), ['F01.1', 'F12.1', 'F01.2', 'F12.2', 'F01.3', 'F12.3', 'F12.4', 'F12.5']);
  // Genau eine Ausnahme je Gruppe „Mag ich nicht“, die erste Untergruppe
  assert.deepEqual(ids(order.filter((entry) => entry.reason === REASONS.EXCEPTION)), ['F02.1', 'F04.1', 'F05.1']);
  // Die übrigen Kinder von „Mag ich nicht“ werden nicht gefragt, sondern vermutet
  assert.ok(!ids(order).includes('F02.2'));
  // Keine zwei Karten derselben Gruppe hintereinander beim Unterscheiden
  const differentiate = order.filter((entry) => entry.reason === REASONS.DIFFERENTIATE);
  for (let i = 1; i < 6; i += 1) assert.notEqual(differentiate[i].card.parentId, differentiate[i - 1].card.parentId);
  // Keine Gruppe ohne Untergruppen (Eier, Kartoffeln) und keine Gruppe nochmals
  assert.ok(order.every((entry) => entry.card.stage > 1));
});

test('Ausnahme gefunden: die übrigen Untergruppen dieser Gruppe werden gefragt', () => {
  const events = [...allFamilies({ F02: DISLIKE }), answer('F02.1', LIKE)];
  const after = ranked(events).filter((entry) => entry.card.parentId === 'F02');
  assert.deepEqual(after.map((entry) => [entry.card.id, entry.reason]), [
    ['F02.2', REASONS.AFTER_EXCEPTION],
    ['F02.3', REASONS.AFTER_EXCEPTION],
  ]);
  const none = ranked([...allFamilies({ F02: DISLIKE }), answer('F02.1', DISLIKE)]);
  assert.ok(!none.some((entry) => entry.card.parentId === 'F02'), 'keine Ausnahme: nichts mehr aus Fisch');
});

test('Sorten (Stufe 3): nach „Mag ich sehr“ früh, nach „Mag ich“ zuletzt', () => {
  const events = [...allFamilies({ F04: LIKE, F13: LIKE }), answer('F04.2', PREFER), answer('F13.1', LIKE)];
  const order = ranked(events);
  assert.deepEqual(ids(order.filter((entry) => entry.reason === REASONS.FAVORITE_DETAIL)), ['F04.2.1', 'F04.2.2', 'F04.2.3']);
  const details = order.filter((entry) => entry.reason === REASONS.DETAIL);
  assert.equal(details.length, 8, 'alle Baumnüsse');
  assert.ok(order.indexOf(details[0]) > order.findLastIndex((entry) => entry.reason === REASONS.DIFFERENTIATE));
});

test('„Vertrage ich nicht“ nur für einen Teil: höchstens zwei der übrigen Kinder', () => {
  const events = allFamilies({ F13: INTOLERANT }).map((event) => (event.cardId === 'F13' ? { ...event, excludedCardIds: ['F13.1.1'] } : event));
  const nuts = ranked(events).filter((entry) => entry.card.parentId === 'F13');
  assert.deepEqual(nuts.map((entry) => [entry.card.id, entry.reason]), [
    ['F13.1', REASONS.AFTER_INTOLERANT],
    ['F13.2', REASONS.AFTER_INTOLERANT],
  ]);
});

test('Die Regeln folgen der aktuellen Bewertung, auch wenn sie im Profil geändert wurde', () => {
  const events = [...allFamilies({}), { type: RATING_CHANGED, source: 'profile', cardId: 'F12', rating: DISLIKE, previousRating: LIKE }];
  const fruit = ranked(events).filter((entry) => entry.card.parentId === 'F12');
  assert.deepEqual(fruit.map((entry) => entry.reason), [REASONS.EXCEPTION]);
});

test('Ausschlüsse wirken auch in der adaptiven Auswahl', () => {
  const vegetarian = { diet: 'vegetarian', exclusions: [], cardLabels: {} };
  const order = rankedCards(state(allFamilies({}), 1, vegetarian), SELECTION.ADAPTIVE);
  assert.ok(!ids(order).some((id) => id.startsWith('F01') || id.startsWith('F02')));
});

// ---------- Kontrollkarten und Budget ----------

const HOLDOUT = ['F12.3', 'F01.2', 'F05.4', 'F10.1', 'F08.2', 'F04.1'];
const holdoutEvent = { type: HOLDOUT_DRAWN, cardIds: HOLDOUT, method: 'test', eligible: 36 };

test('Kontrollkarten kommen nie in der Auswahl vor, sondern am Ende von Runde 4', () => {
  const session = simulateSession({ index, diets, config: { ...config, holdout: 6 }, respond: () => LIKE, sessionId: 'budget' });
  const answers = session.events.filter((event) => event.type === 'ANSWER');
  assert.equal(answers.length, MAX_ROUNDS * 10, 'vier volle Runden');
  const checks = answers.filter((event) => event.phase === PHASE_HOLDOUT);
  assert.equal(checks.length, 6);
  assert.deepEqual(answers.slice(-6), checks, 'die letzten sechs Karten');
  assert.ok(checks.every((event) => event.round === 4 && event.selectionReason === REASONS.HOLDOUT));
  const holdout = session.events[0].cardIds;
  assert.deepEqual(checks.map((event) => event.cardId), holdout, 'in der gezogenen Reihenfolge');
  for (let round = 1; round <= 4; round += 1) assert.ok(answers.filter((event) => event.round === round).length <= 10);
});

test('Endet die Auswahl früher, folgen die Kontrollkarten direkt', () => {
  // Alles „Mag ich nicht“ ohne Ausnahme: 13 Gruppen und je eine Ausnahme, dann nichts mehr
  const session = simulateSession({ index, diets, config: { ...config, holdout: 6 }, respond: () => DISLIKE, sessionId: 'kurz' });
  const answers = session.events.filter((event) => event.type === 'ANSWER');
  const main = answers.filter((event) => event.phase !== PHASE_HOLDOUT);
  // 11 Gruppen haben Untergruppen; jede bekommt genau eine Ausnahme, auch wenn eine Untergruppe Kontrollkarte ist
  assert.equal(main.filter((event) => event.selectionReason === REASONS.EXCEPTION).length, 11);
  assert.equal(main.length, 13 + 11);
  assert.deepEqual(answers.slice(-6).map((event) => event.phase), Array(6).fill(PHASE_HOLDOUT));
  const last = deriveRoundState({ index, onboarding: NO_ONBOARDING, diets, events: session.events, round: answers.at(-1).round });
  assert.equal(hasMoreCards(last, config), false);
  assert.deepEqual(openHoldout(last), []);
});

test('Budget: In Runde 4 bekommt die Auswahl nur so viele Plätze, dass alle Kontrollkarten Platz haben', () => {
  // Drei volle Runden, alles „Mag ich“
  const answered = [];
  for (let round = 1; round <= 3; round += 1) {
    for (let card = nextCard(state([holdoutEvent, ...answered], round), config); card; card = nextCard(state([holdoutEvent, ...answered], round), config)) {
      answered.push(answer(card.id, LIKE, { round }));
    }
  }
  assert.equal(answered.length, 30);
  assert.ok(!answered.some((event) => HOLDOUT.includes(event.cardId)));
  const fourth = state([holdoutEvent, ...answered], 4);
  const cards = selectNextCards(fourth, config).map((card) => card.id);
  assert.equal(cards.length, 10);
  assert.deepEqual(cards.slice(4), HOLDOUT);
  assert.ok(!cards.slice(0, 4).some((id) => HOLDOUT.includes(id)));
  // Der Ausblick nach Runde 3 zeigt genau diese Karten
  assert.deepEqual(nextRoundCards(state([holdoutEvent, ...answered], 3), config).map((card) => card.id), cards);
  // Eine im Profil ausgeschlossene Kontrollkarte fällt weg
  const excluded = [holdoutEvent, ...answered, { type: 'EXCLUSION_ADDED', source: 'profile', section: 'never', exclusions: [{ type: 'card', value: 'F12.3' }] }];
  assert.deepEqual(openHoldout(state(excluded, 4)).map((card) => card.id), HOLDOUT.slice(1));
});

test('Die feste Reihenfolge (Version 0.6) bleibt wählbar und hält Kontrollkarten ebenfalls zurück', () => {
  const fixed = selectNextCards(state([holdoutEvent]), { roundCardLimit: 100 });
  assert.ok(fixed.slice(0, 13).every((card) => card.stage === 1));
  assert.ok(!fixed.slice(0, -6).some((card) => HOLDOUT.includes(card.id)), 'auch die feste Reihenfolge hält Kontrollkarten zurück');
  assert.equal(selectionReason(state([]), index.get('F01.2')), REASONS.FIXED_STAGE2);
});

// ---------- Vermutungen im Profil ----------

test('Vermutungen: getrennt von den Bewertungen, stärkste zuerst, ohne offene Kontrollkarten', () => {
  const events = [holdoutEvent, answer('F12', LIKE), answer('F01', PREFER), answer('F02', DISLIKE), answer('F01.1', DISLIKE), answer('F03', UNFAMILIAR)];
  const current = state(events);
  const derived = derivedEntries(current);
  const byId = Object.fromEntries(derived.map((entry) => [entry.cardId, entry]));
  assert.deepEqual(byId['F01.3'], { cardId: 'F01.3', score: 1, rating: LIKE, basisId: 'F01', basisRating: PREFER });
  assert.deepEqual(byId['F12.1'], { cardId: 'F12.1', score: 0.5, rating: LIKE, basisId: 'F12', basisRating: LIKE });
  assert.equal(byId['F02.1'].rating, DISLIKE);
  assert.ok(!('F01.1' in byId), 'direkt bewertet');
  assert.ok(!('F01.2' in byId) && !('F12.3' in byId), 'Kontrollkarten erst nach der Antwort');
  assert.ok(!derived.some((entry) => index.get(entry.cardId).stage === 1), 'Gruppen werden immer direkt gefragt');
  assert.equal(derived[0].score, 1, 'Vermutungen aus „Mag ich sehr“ zuerst');
  // Im Geschmack zählen sie nie
  assert.deepEqual(computeProfile(current).groups[LIKE], ['F12']);
  assert.deepEqual(buildProfile(current).predicted.find((entry) => entry.cardId === 'F12.1'), { cardId: 'F12.1', score: 0.5, basisId: 'F12' });
});

test('Eine Vermutung im Profil bestätigen: Sie wird zur direkten Bewertung und nicht mehr gefragt', () => {
  const base = [...allFamilies({ F12: LIKE })];
  const confirm = { type: RATING_CHANGED, source: 'profile', cardId: 'F12.1', rating: PREFER, previousRating: null, fromPrediction: true, predictedScore: 0.5 };
  const current = state([...base, confirm]);
  assert.deepEqual(current.profileRated, ['F12.1']);
  assert.ok(computeProfile(current).groups[PREFER].includes('F12.1'));
  assert.ok(tasteSignals(current).some((signal) => signal.cardId === 'F12.1'));
  assert.ok(!ids(rankedCards(current, SELECTION.ADAPTIVE)).includes('F12.1'));
  assert.ok(!derivedEntries(current).some((entry) => entry.cardId === 'F12.1'));
  // Später nochmals geändert (ohne fromPrediction): gilt weiter
  const changed = state([...base, confirm, { type: RATING_CHANGED, source: 'profile', cardId: 'F12.1', rating: DISLIKE, previousRating: PREFER }]);
  assert.equal(changed.ratings['F12.1'], DISLIKE);
  // Eine gewöhnliche Änderung ohne Antwort beim Wischen zählt nicht (wie bisher)
  assert.deepEqual(state([...base, { type: RATING_CHANGED, source: 'profile', cardId: 'F12.2', rating: LIKE }]).profileRated, []);
  // Rückgängig beim Wischen macht keine frühere Profiländerung zu einer Bewertung
  const undone = state([answer('F01', LIKE), { type: RATING_CHANGED, source: 'profile', cardId: 'F01', rating: PREFER }, answer('F01', UNDO)]);
  assert.deepEqual([undone.profileRated, 'F01' in undone.ratings], [[], false]);
});

test('Simulierte Sitzungen: jede Runde höchstens 10 Karten, nie eine Karte doppelt', () => {
  const tastes = [
    () => LIKE,
    tasteByFamily(index, { F01: PREFER, F02: DISLIKE, F03: UNFAMILIAR, F04: LIKE, F05: DISLIKE, F06: LIKE, F07: PREFER, F08: LIKE, F09: LIKE, F10: DISLIKE, F11: LIKE, F12: PREFER, F13: UNFAMILIAR }),
    (card) => [DISLIKE, LIKE, PREFER, UNFAMILIAR][card.id.length % 4],
  ];
  for (const [i, respond] of tastes.entries()) {
    const session = simulateSession({ index, diets, config: { ...config, holdout: 6 }, respond, sessionId: `p${i}` });
    const answers = session.events.filter((event) => event.type === 'ANSWER');
    assert.equal(new Set(answers.map((event) => event.cardId)).size, answers.length, `p${i}`);
    assert.ok(answers.length <= 40);
    assert.equal(answers.filter((event) => event.phase === PHASE_HOLDOUT).length, 6, `p${i}: alle Kontrollkarten gezeigt`);
  }
});
