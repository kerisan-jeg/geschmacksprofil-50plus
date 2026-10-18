import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_ROUNDS } from '../config.js';
import { indexCatalog } from './catalog.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNDO, UNFAMILIAR } from './answers.js';
import { buildProfile, computeProfile, deriveRoundState, derivedEntries, hasMoreCards, nextCard, nextRoundCards, openHoldout, selectionReason, selectNextCards, tasteSignals } from './engine.js';
import { HOLDOUT_DRAWN, PHASE_HOLDOUT, RATING_CHANGED } from './events.js';
import { rankedCards, rankedStageCards, REASONS, SELECTION } from './selection.js';
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

const reasonsOf = (entries, parentId) => entries.filter((entry) => entry.card.parentId === parentId).map((entry) => [entry.card.id, entry.reason]);

test('„Kenne ich nicht“ wird auf der nächsten Ebene mit höchstens zwei Kindern geklärt', () => {
  const unknown = [answer('F01', LIKE), answer('F02', UNFAMILIAR)];
  assert.equal(nextCard(state(unknown), config).id, 'F03', 'Runde 1 bleibt bei Familien');
  assert.equal(nextCard(state(unknown, 2), config).id, 'F02.1', 'Klärung zuerst in Runde 2');
  assert.equal(selectionReason(state(unknown, 2), index.get('F02.1'), config), REASONS.AFTER_UNFAMILIAR);
  // Auch das Kind unbekannt: ein zweites, andersartiges, danach keines mehr
  const twice = [...unknown, answer('F02.1', UNFAMILIAR, { round: 2 })];
  assert.equal(nextCard(state(twice, 2), config).id, 'F02.2');
  const thrice = [...twice, answer('F02.2', UNFAMILIAR, { round: 2 })];
  assert.ok(!ids(rankedStageCards(state(thrice, 2), SELECTION.ADAPTIVE)).includes('F02.3'), 'höchstens zwei Klärungskarten');
  // Das Kind wird bewertet (gern oder nicht): Die Antwort gilt nur für das Kind, die Gruppe bleibt unbekannt
  for (const response of [LIKE, DISLIKE]) {
    assert.ok(!ids(ranked([...unknown, answer('F02.1', response)])).some((id) => id.startsWith('F02.')), response);
  }
});

test('Unbekanntes Fruchtgemüse in Runde 2 → Zucchetti und höchstens Peperoni in Runde 3', () => {
  const roundOne = allFamilies({}).map((event) => ({ ...event, round: 1 }));
  const unknown = [...roundOne, answer('F11.1', LIKE, { round: 2 }), answer('F11.3', UNFAMILIAR, { round: 2 })];
  assert.ok(selectNextCards(state(unknown, 2), config).every((card) => card.stage === 2));
  assert.equal(nextCard(state(unknown, 3), config).id, 'F11.3.1');
  assert.equal(index.get('F11.3.1').title, 'Zucchetti');
  assert.equal(selectionReason(state(unknown, 3), index.get('F11.3.1'), config), REASONS.AFTER_UNFAMILIAR_DETAIL);
  const again = [...unknown, answer('F11.3.1', UNFAMILIAR, { round: 3 })];
  assert.equal(nextCard(state(again, 3), config).id, 'F11.3.2');
  assert.equal(index.get('F11.3.2').title, 'Gegarte Peperoni');
  assert.ok(!ids(rankedStageCards(state([...again, answer('F11.3.2', UNFAMILIAR, { round: 3 })], 3), SELECTION.ADAPTIVE)).some((id) => id.startsWith('F11.3.')), 'danach unbekannt');
  assert.ok(selectNextCards(state(unknown, 4), config).every((card) => card.stage === 4), 'Runde 4 holt keine Lebensmittel nach');
});

test('Kap. 11: Hülsenfrüchte „Mag ich nicht“ → Sojaprodukte als Ausnahme; bei „Mag ich“ Naturtofu oder Tempeh, sonst stoppen', () => {
  const disliked = allFamilies({ F05: DISLIKE });
  assert.deepEqual(reasonsOf(ranked(disliked), 'F05'), [['F05.4', REASONS.EXCEPTION]]);
  const liked = [...disliked, answer('F05.4', LIKE)];
  assert.deepEqual(reasonsOf(ranked(liked), 'F05.4'), [
    ['F05.4.1', REASONS.EXCEPTION_DETAIL],
    ['F05.4.2', REASONS.EXCEPTION_DETAIL],
  ]);
  assert.deepEqual([index.get('F05.4.1').title, index.get('F05.4.2').title], ['Naturtofu', 'Tempeh']);
  assert.ok(!ids(ranked(liked)).some((id) => ['F05.1', 'F05.2', 'F05.3'].includes(id)), 'die übrigen Hülsenfrüchte bleiben vermutet');
  const stopped = ranked([...disliked, answer('F05.4', DISLIKE)]);
  assert.ok(!ids(stopped).some((id) => id.startsWith('F05.')), 'bei „Mag ich nicht“ vorerst stoppen');
  // Fisch und Meeresfrüchte „Mag ich nicht“ → Meeresfrüchte als Ausnahme, bei „Mag ich“ Garnelen
  const fish = allFamilies({ F02: DISLIKE });
  assert.deepEqual(reasonsOf(ranked(fish), 'F02'), [['F02.2', REASONS.EXCEPTION]]);
  assert.equal(ids(ranked([...fish, answer('F02.2', LIKE)])).find((id) => id.startsWith('F02.2.')), 'F02.2.1');
  assert.equal(index.get('F02.2.1').title, 'Garnelen');
});

test('Kap. 11: Obst „Mag ich“ → Beeren und Zitrusfrüchte; nur bei verschiedenem Geschmack Erdbeeren oder Orangen und die übrigen', () => {
  const liked = allFamilies({ F12: LIKE });
  assert.deepEqual(reasonsOf(ranked(liked), 'F12'), [
    ['F12.1', REASONS.CONTRAST],
    ['F12.4', REASONS.CONTRAST],
  ]);
  // Gleicher Geschmack: Der Zweig ist geklärt, nichts mehr aus Obst
  const same = ranked([...liked, answer('F12.1', LIKE), answer('F12.4', LIKE)]);
  assert.ok(!ids(same).some((id) => id.startsWith('F12.')));
  // Verschieden: zuerst je ein konkretes Lebensmittel, später die übrigen Untergruppen
  const differ = ranked([...liked, answer('F12.1', PREFER), answer('F12.4', DISLIKE)]);
  const fruit = differ.filter((entry) => entry.card.id.startsWith('F12.'));
  assert.deepEqual(fruit.slice(0, 2).map((entry) => [index.get(entry.card.id).title, entry.reason]), [
    ['Erdbeeren', REASONS.DIFFERENCE_DETAIL],
    ['Orangen', REASONS.DIFFERENCE_DETAIL],
  ]);
  assert.deepEqual(
    fruit.filter((entry) => entry.reason === REASONS.DIFFERENCE).map((entry) => entry.card.id),
    ['F12.2', 'F12.3', 'F12.5']
  );
  // Milchprodukte „Mag ich sehr“ → frische Milchprodukte und Käse unterscheiden
  assert.deepEqual(reasonsOf(ranked(allFamilies({ F04: PREFER })), 'F04'), [
    ['F04.1', REASONS.CONTRAST],
    ['F04.2', REASONS.CONTRAST],
  ]);
  // Eier „Mag ich“: keine Untergruppe nötig
  assert.ok(!ids(ranked(allFamilies({ F03: LIKE }))).some((id) => id.startsWith('F03')));
});

test('Untergruppe „Mag ich sehr“: konkrete Favoriten, höchstens drei', () => {
  const events = [...allFamilies({ F04: PREFER, F12: LIKE }), answer('F04.1', PREFER), answer('F04.2', PREFER), answer('F12.1', PREFER), answer('F12.4', PREFER)];
  const favorites = ranked(events).filter((entry) => entry.reason === REASONS.FAVORITE_DETAIL);
  assert.deepEqual(favorites.map((entry) => index.get(entry.card.id).title), [
    'Naturjoghurt', 'Hartkäse', 'Erdbeeren', 'Orangen',
    'Skyr', 'Weichkäse', 'Heidelbeeren', 'Mandarinen',
    'Quark', 'Frischkäse', 'Himbeeren', 'Grapefruit',
  ]);
  // Ist der Kontrast verschieden, kommt das erste konkrete Lebensmittel schon als Präzisierung
  const differ = ranked([...allFamilies({ F04: PREFER }), answer('F04.1', LIKE), answer('F04.2', PREFER)]);
  assert.deepEqual(differ.filter((entry) => entry.card.parentId === 'F04.2').map((entry) => entry.reason), [REASONS.DIFFERENCE_DETAIL, REASONS.FAVORITE_DETAIL, REASONS.FAVORITE_DETAIL]);
});

test('Rangfolge: Klärung, Gruppen, Ausnahmen, Kontraste, Präzisierung, Favoriten, übrige Unterschiede; Gruppen wechseln sich ab', () => {
  const events = [...allFamilies({ F01: PREFER, F12: LIKE, F02: DISLIKE, F05: DISLIKE }), answer('F12.1', PREFER), answer('F12.4', DISLIKE), answer('F05.4', LIKE), answer('F01.1', PREFER), answer('F01.3', PREFER)];
  const reasons = ranked(events).map((entry) => entry.reason);
  const order = [REASONS.EXCEPTION, REASONS.CONTRAST, REASONS.EXCEPTION_DETAIL, REASONS.FAVORITE_DETAIL, REASONS.DIFFERENCE];
  for (let i = 1; i < order.length; i += 1) {
    assert.ok(reasons.lastIndexOf(order[i - 1]) < reasons.indexOf(order[i]), `${order[i - 1]} vor ${order[i]}`);
  }
  const contrasts = ranked(events).filter((entry) => entry.reason === REASONS.CONTRAST);
  for (let i = 1; i < 6; i += 1) assert.notEqual(contrasts[i].card.parentId, contrasts[i - 1].card.parentId);
  assert.ok(ranked(events).every((entry) => entry.card.stage > 1 && entry.card.stage < 4), 'keine Gruppe nochmals, keine Gerichte');
});

test('Kontrast und Ausnahme weichen einer Kontrollkarte aus', () => {
  const holdout = { type: HOLDOUT_DRAWN, cardIds: ['F12.1', 'F05.4'] };
  const events = [holdout, ...allFamilies({ F12: LIKE, F05: DISLIKE })];
  assert.deepEqual(reasonsOf(ranked(events), 'F12'), [
    ['F12.4', REASONS.CONTRAST],
    ['F12.2', REASONS.CONTRAST],
  ]);
  assert.deepEqual(reasonsOf(ranked(events), 'F05'), [['F05.1', REASONS.EXCEPTION]]);
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

test('Kontrollkarten schliessen Runde 2 ab; Runde 4 enthält ausschliesslich Gerichte', () => {
  const session = simulateSession({ index, diets, config: { ...config, roundCardLimit: 13, holdout: 6 }, respond: () => LIKE, sessionId: 'budget' });
  const answers = session.events.filter((event) => event.type === 'ANSWER');
  assert.equal(answers.length, MAX_ROUNDS * 13, 'vier volle Runden');
  const checks = answers.filter((event) => event.phase === PHASE_HOLDOUT);
  assert.equal(checks.length, 6);
  assert.deepEqual(answers.filter((event) => event.round === 2).slice(-6), checks, 'die letzten sechs Karten von Runde 2');
  assert.ok(checks.every((event) => event.round === 2 && event.selectionReason === REASONS.HOLDOUT));
  assert.ok(answers.filter((event) => event.round === 4).every((event) => event.stage === 4 && event.phase === 'dish'));
  const holdout = session.events[0].cardIds;
  assert.deepEqual(checks.map((event) => event.cardId), holdout, 'in der gezogenen Reihenfolge');
  for (let round = 1; round <= 4; round += 1) assert.ok(answers.filter((event) => event.round === round).length <= 13);
});

test('Bei durchgängiger Ablehnung werden keine langen Lebensmittel-Nachfragen angehängt', () => {
  // Alles „Mag ich nicht“ ohne Ausnahme: 13 Gruppen und je eine Ausnahme, dann nichts mehr
  const session = simulateSession({ index, diets, config: { ...config, holdout: 6 }, respond: () => DISLIKE, sessionId: 'kurz' });
  const answers = session.events.filter((event) => event.type === 'ANSWER');
  const main = answers.filter((event) => event.phase === 'main');
  // 11 Gruppen haben Untergruppen; jede bekommt genau eine Ausnahme, auch wenn eine Untergruppe Kontrollkarte ist
  assert.ok(main.filter((event) => event.selectionReason === REASONS.EXCEPTION).length <= 10 - 6);
  assert.ok(!answers.some((event) => event.stage === 3), 'abgelehnte Untergruppen werden nicht beliebig vertieft');
  assert.deepEqual(answers.filter((event) => event.round === 2).slice(-6).map((event) => event.phase), Array(6).fill(PHASE_HOLDOUT));
  assert.ok(answers.some((event) => event.round === 4 && event.stage === 4));
  const last = deriveRoundState({ index, onboarding: NO_ONBOARDING, diets, events: session.events, round: answers.at(-1).round });
  assert.equal(hasMoreCards(last, config), false);
  assert.deepEqual(openHoldout(last), []);
});

test('Kontrollkarten teilen das Budget von Runde 2 und erscheinen nie verspätet in Runde 4', () => {
  const answered = allFamilies({});
  const second = state([holdoutEvent, ...answered], 2);
  const cards = selectNextCards(second, config).map((card) => card.id);
  assert.equal(cards.length, 10);
  assert.deepEqual(cards.slice(4), HOLDOUT);
  assert.ok(!cards.slice(0, 4).some((id) => HOLDOUT.includes(id)));
  assert.deepEqual(nextRoundCards(state([holdoutEvent, ...answered]), config).map((card) => card.id), cards);
  assert.ok(selectNextCards(state([holdoutEvent, ...answered], 4), config).every((card) => card.stage === 4));
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

test('Normale Vertiefung wechselt auch bei laufender Neuberechnung zwischen Familien', () => {
  const session = simulateSession({ index, diets, config: { ...config, roundCardLimit: 13, holdout: 6 }, respond: () => LIKE, sessionId: 'wechsel' });
  const familyOf = (id) => {
    let card = index.get(id);
    while (card.parentId) card = index.get(card.parentId);
    return card.id;
  };
  for (const round of [2, 3]) {
    const normal = session.events.filter((event) => event.round === round && event.phase === 'main');
    assert.ok(normal.length > 3);
    for (let i = 1; i < normal.length; i += 1) assert.notEqual(familyOf(normal[i - 1].cardId), familyOf(normal[i].cardId), `Runde ${round}: verschiedene Gruppen nacheinander`);
  }
});

test('nurec Kap. 9 nachgespielt: vegan, Hülsenfrüchte „Mag ich nicht“ → Sojaprodukte → Naturtofu; Hummus gilt nur für Hummus', async () => {
  const { predictScores } = await import('./preferences.js');
  const vegan = { diet: 'vegan', exclusions: [], cardLabels: {} };
  const at = (events) => deriveRoundState({ index, onboarding: vegan, diets, events, round: 1 });
  // Fleisch und Milchprodukte erscheinen nicht als Karten
  const first = selectNextCards(at([]), { ...config, roundCardLimit: 30 }).map((card) => card.id);
  assert.ok(!first.some((id) => ['F01', 'F02', 'F03', 'F04'].includes(id)));
  const events = first.map((id) => answer(id, id === 'F05' ? DISLIKE : LIKE));
  assert.ok(rankedCards(at(events), SELECTION.ADAPTIVE).some((entry) => entry.card.id === 'F05.4' && entry.reason === REASONS.EXCEPTION), 'Sojaprodukte als Ausnahme');
  events.push(answer('F05.4', LIKE));
  assert.equal(rankedCards(at(events), SELECTION.ADAPTIVE).find((entry) => entry.reason === REASONS.EXCEPTION_DETAIL)?.card.id, 'F05.4.1', 'Naturtofu');
  events.push(answer('F05.4.1', PREFER), answer('F05.3.2', LIKE));
  // Die Hummus-Antwort überträgt sich nicht auf Kichererbsen oder Sesam
  const ratings = at(events).ratings;
  const predictions = predictScores(index, ratings);
  assert.equal(predictions.get('F05.3.2').direct, true);
  assert.notEqual(predictions.get('F05.3')?.direct, true, 'Kichererbsen nicht direkt bewertet');
  assert.ok((predictions.get('F05.3')?.score ?? -1) < 0, 'Kichererbsen bleiben „eher ungern“ aus Hülsenfrüchte');
  assert.ok(!predictions.has('F13.2.3') || predictions.get('F13.2.3').basisId !== 'F05.3.2', 'Sesam nicht aus Hummus');
});
