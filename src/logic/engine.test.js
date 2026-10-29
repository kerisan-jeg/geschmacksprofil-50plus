import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexCatalog } from './catalog.js';
import { buildProfile, canResumeRound, deriveRoundState, dishAffinity, openDishes, ROUND_STATUS, roundStatus, hasMoreCards, isRoundComplete, nextCard, nextRoundCards, presentCard, progress, replay, selectionReason, selectNextCards, tasteSignals } from './engine.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNDO, UNFAMILIAR } from './answers.js';
import { deriveOnboarding, emptyAnswers } from './stage0.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const { diets } = read('../data/stage0.json');
const config = { roundCardLimit: 10 };
const noOnboarding = { diet: null, exclusions: [], cardLabels: {} };
const definition = read('../data/stage0.json');
const answersWithoutSeafood = emptyAnswers(definition.questions);
answersWithoutSeafood.diet = 'none';
answersWithoutSeafood.intolerances.gate = 'no';
answersWithoutSeafood.never = { ...answersWithoutSeafood.never, gate: 'yes', selected: ['animalOrigin:seafood'] };
const noSeafood = deriveOnboarding(definition, answersWithoutSeafood, { allergens: read('../data/allergens.json'), catalogIndex: index });

const answer = (cardId, response, extra = {}) => ({ cardId, response, ...extra });
const state = (events, onboarding = noOnboarding, round = 1) => deriveRoundState({ index, onboarding, diets, events, round });

test('Feste Auswahl hält jede Runde auf einer Ebene und begrenzt direkte Aufrufe mit Limit 100', () => {
  const cards = selectNextCards(state([]), { roundCardLimit: 30 });
  assert.equal(cards.length, 13);
  assert.deepEqual(cards.slice(0, 13).map((card) => card.stage), Array(13).fill(1));
  assert.deepEqual(cards.slice(0, 3).map((card) => card.id), ['F01', 'F02', 'F03']);
  // Danach von jeder Gruppe die erste Untergruppe, dann die zweite: nie mehrere aus derselben Gruppe hintereinander
  const subgroups = selectNextCards(state([], noOnboarding, 2), { roundCardLimit: 100 });
  assert.deepEqual(subgroups.slice(0, 5).map((card) => card.id), ['F01.1', 'F02.1', 'F04.1', 'F05.1', 'F06.1']);
  assert.ok(subgroups.every((card) => card.stage === 2));
  for (let i = 1; i < subgroups.length; i += 1) assert.notEqual(subgroups[i].parentId, subgroups[i - 1].parentId, subgroups[i].id);
  // Jede Runde bleibt auf ihrer Ebene und hat höchstens 15 Karten, auch die Gerichte in Runde 4.
  for (let round = 1; round <= 4; round += 1) {
    const offered = selectNextCards(state([], noOnboarding, round), { roundCardLimit: 100 });
    assert.ok(offered.length <= 15, `Runde ${round}: ${offered.length}`);
    assert.ok(offered.every((card) => card.stage === round));
  }
  assert.equal(selectionReason(state([]), index.get('F01')), 'stage1_fixed_order');
  assert.equal(selectionReason(state([]), index.get('F01.2')), 'stage2_fixed_order');
});

test('Das Rundenlimit begrenzt die Karten', () => {
  assert.equal(selectNextCards(state([]), config).length, 10);
  const events = ['F01', 'F02', 'F03', 'F04'].map((id) => answer(id, LIKE));
  assert.deepEqual(progress(state(events), { roundCardLimit: 4 }), { answered: 4, total: 4, percent: 100 });
  // Prozentwert aus dem Rundenlimit abgeleitet, nicht fest codiert
  assert.deepEqual(progress(state(events.slice(0, 1)), { roundCardLimit: 4 }), { answered: 1, total: 4, percent: 25 });
  assert.deepEqual(progress(state(events.slice(0, 1)), { roundCardLimit: 8 }), { answered: 1, total: 8, percent: 13 });
  assert.equal(isRoundComplete(state(events), { roundCardLimit: 4 }), true);
});

test('Antworten werden gespeichert, offene Karten bleiben UNRATED', () => {
  const current = state([answer('F01', PREFER), answer('F02', DISLIKE), answer('F03', UNFAMILIAR)]);
  const profile = buildProfile(current);
  assert.deepEqual(profile.taste.PREFER, ['F01']);
  assert.deepEqual(profile.taste.DISLIKE, ['F02']);
  assert.deepEqual(profile.unfamiliar, ['F03']);
  assert.equal(profile.unrated.length, 10);
  assert.equal(nextCard(current, config).id, 'F04');
});

test('INTOLERANT → harter Ausschluss mit source "swipe", kein Geschmackssignal, zählt fürs Limit', () => {
  const current = state([answer('F03', INTOLERANT)]);
  assert.deepEqual(current.swipeExclusions, [{ type: 'card', value: 'F03', source: 'swipe', origin: 'F03' }]);
  assert.ok(current.exclusions.cardIds.has('F03'));
  assert.deepEqual(tasteSignals(current), []);
  const profile = buildProfile(current);
  assert.deepEqual(profile.intolerant, ['F03']);
  assert.ok(!Object.values(profile.taste).flat().includes('F03'));
  assert.equal(progress(current, config).answered, 1);
});

test('INTOLERANT mit Auswahl: nur die gewählten Kinder werden ausgeschlossen', () => {
  const hazelnut = index.cards.find((card) => card.allergens.includes('hazelnut')).id;
  const current = state([answer('F01', LIKE), answer('F13', INTOLERANT, { excludedCardIds: [hazelnut] })]);
  assert.ok(current.exclusions.cardIds.has(hazelnut));
  assert.ok(!current.exclusions.cardIds.has('F13'));
});

test('INTOLERANT auf einer Familie entfernt sie aus den nächsten Karten', () => {
  const current = state([answer('F01', INTOLERANT, { excludedCardIds: ['F02'] })]);
  assert.ok(!selectNextCards(current, config).some((card) => card.id === 'F02'));
});

test('UNDO stellt den vorherigen Zustand exakt wieder her (inkl. INTOLERANT)', () => {
  const before = [answer('F01', LIKE), answer('F02', DISLIKE)];
  const withIntolerant = [...before, answer('F03', INTOLERANT)];
  assert.deepEqual(state([...withIntolerant, answer('F03', UNDO)]), state(before));
  assert.deepEqual(state([...before, answer('F03', PREFER), answer('F03', UNDO)]), state(before));
  // Mehrere UNDO hintereinander nehmen mehrere Antworten zurück.
  assert.deepEqual(state([...withIntolerant, answer('F03', UNDO), answer('F02', UNDO)]), state([before[0]]));
  // Danach kann die Karte neu beantwortet werden.
  const redone = state([...withIntolerant, answer('F03', UNDO), answer('F03', LIKE)]);
  assert.equal(redone.answers.F03, LIKE);
  assert.ok(!redone.exclusions.cardIds.has('F03'));
});

test('UNDO nach INTOLERANT auf einer Familie: ausgeschlossene Kinder sind wieder da, kein Ausschluss bleibt', () => {
  const before = [answer('F01', LIKE)];
  const intolerant = [...before, answer('F13', INTOLERANT, { excludedCardIds: ['F13.1.1', 'F13.1.3'] })];
  const excluded = state(intolerant);
  assert.ok(excluded.exclusions.cardIds.has('F13.1.1') && excluded.exclusions.cardIds.has('F13.1.3'));
  assert.equal(buildProfile(excluded).intolerant.length, 1);
  const undone = state([...intolerant, answer('F13', UNDO)]);
  assert.deepEqual(undone, state(before));
  assert.deepEqual(undone.swipeExclusions, []);
  assert.deepEqual(buildProfile(undone).intolerant, []);
  assert.deepEqual(tasteSignals(undone), [{ cardId: 'F01', response: LIKE }]);
  assert.ok(selectNextCards(undone, { roundCardLimit: 30 }).some((card) => card.id === 'F13'), 'F13 kommt wieder');
});

test('UNDO ohne vorherige Antwort ändert nichts', () => {
  assert.deepEqual(state([answer('F01', UNDO)]), state([]));
});

test('Eine Karte wird nicht doppelt beantwortet', () => {
  const played = replay([answer('F01', LIKE), answer('F01', DISLIKE)]);
  assert.equal(played.answers.F01, LIKE);
  assert.deepEqual(played.sequence, ['F01']);
});

test('„Vertrage ich nicht“ auf Nüsse und Samen bietet einzelne Nüsse statt nur die ganze Familie', async () => {
  const { intoleranceOptions, collapseIntolerance } = await import('./engine.js');
  const current = state([]);
  const nuts = index.get('F13');
  const options = intoleranceOptions(current, nuts);
  assert.deepEqual(options.sections.map((section) => section.label), ['Baumnüsse', 'Kerne und Samen']);
  const hazelnut = options.sections[0].options.find((option) => option.label === 'Haselnüsse').id;
  assert.deepEqual(collapseIntolerance(current, nuts, [hazelnut]), [hazelnut]);
  const treeNuts = options.sections[0].options.map((option) => option.id);
  assert.deepEqual(collapseIntolerance(current, nuts, treeNuts), ['F13.1']);
  const everything = options.sections.flatMap((section) => section.options.map((option) => option.id));
  assert.deepEqual(collapseIntolerance(current, nuts, everything), ['F13']);
  // Eine Karte ohne Kinder wird direkt ausgeschlossen.
  assert.equal(intoleranceOptions(current, index.get('F03')), null);
});

test('Die Detailauswahl zeigt nur, was nach den Ausschlüssen noch sichtbar ist', async () => {
  const { intoleranceOptions } = await import('./engine.js');
  const onboarding = { diet: null, exclusions: [{ type: 'allergen', value: 'hazelnut', source: 'onboarding' }], cardLabels: {} };
  const options = intoleranceOptions(state([], onboarding), index.get('F13'));
  assert.ok(!options.sections[0].options.some((option) => option.label === 'Haselnüsse'));
});

// ---------- Runden ----------

const roundOne = ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10'].map((id) => answer(id, LIKE, { round: 1 }));

test('Runde 2 fragt ausschliesslich Untergruppen, auch wenn nach einem alten Limit Familien offen sind', () => {
  assert.equal(isRoundComplete(state(roundOne), config), true, 'Runde 1 ist nach 10 Karten fertig');
  assert.equal(hasMoreCards(state(roundOne)), true);
  const second = state(roundOne, noOnboarding, 2);
  assert.deepEqual(progress(second, config), { answered: 0, total: 10, percent: 0 }, 'Fortschritt zählt je Runde');
  assert.deepEqual(selectNextCards(second, config).map((card) => card.id), ['F01.1', 'F02.1', 'F04.1', 'F05.1', 'F06.1', 'F07.1', 'F08.1', 'F10.1', 'F11.1', 'F12.1']);
  assert.deepEqual(nextRoundCards(state(roundOne), config).map((card) => card.id), selectNextCards(second, config).map((card) => card.id));
  // Antworten ohne Rundennummer zählen zu Runde 1 (ältere Protokolle)
  assert.deepEqual(state(roundOne.map(({ round, ...event }) => event), noOnboarding, 2).roundSequence, []);
});

test('Rückgängig wirkt nur in der laufenden Runde', () => {
  const second = state(roundOne, noOnboarding, 2);
  assert.equal(second.lastEvent, null, 'zu Beginn von Runde 2 gibt es nichts rückgängig zu machen');
  const answered = state([...roundOne, answer('F01.1', LIKE, { round: 2 })], noOnboarding, 2);
  assert.equal(answered.lastEvent.cardId, 'F01.1');
  assert.deepEqual(answered.roundSequence, ['F01.1']);
  const undone = state([...roundOne, answer('F01.1', LIKE, { round: 2 }), answer('F01.1', UNDO, { round: 2 })], noOnboarding, 2);
  assert.deepEqual(undone.roundSequence, []);
  assert.equal(undone.sequence.length, 10, 'Runde 1 bleibt unverändert');
});

test('Ausschlüsse gelten in jeder Runde: keine Untergruppen von ausgeschlossenen Gruppen', () => {
  const intolerantFish = roundOne.map((event) => (event.cardId === 'F02' ? answer('F02', INTOLERANT, { round: 1, excludedCardIds: ['F02'] }) : event));
  const ids = selectNextCards(state(intolerantFish, noOnboarding, 2), { roundCardLimit: 100 }).map((card) => card.id);
  assert.ok(!ids.some((id) => id.startsWith('F02.')), 'nach „Vertrage ich nicht“ bei Fisch kein Lachs');
  const vegetarian = { diet: 'vegetarian', exclusions: [], cardLabels: {} };
  const veggie = selectNextCards(state([], vegetarian), { roundCardLimit: 100 }).map((card) => card.id);
  assert.ok(!veggie.some((id) => id.startsWith('F01') || id.startsWith('F02')));
});

test('Untergruppen nennen ihre Gruppe; nach allen Karten gibt es keine weitere Runde', () => {
  assert.equal(presentCard(state([]), index.get('F01.2')).group, 'Fleisch und Geflügel');
  assert.equal(presentCard(state([]), index.get('F01')).group, undefined);
  const everything = index.cards.map((card) => answer(card.id, LIKE, { round: card.stage }));
  assert.equal(hasMoreCards(state(everything)), false);
  assert.deepEqual(nextRoundCards(state(everything), config), []);
});

test('Frage 3 ohne Meeresfrüchte: Fisch in Runde 2 heisst auch im Etikett nur Fisch', () => {
  const second = state(roundOne, noSeafood, 2);
  const fish = presentCard(second, selectNextCards(second, config).find((card) => card.id === 'F02.1'));
  assert.equal(fish.id, 'F02.1');
  assert.equal(fish.title, 'Fisch');
  assert.equal(fish.group, 'Fisch');
  assert.deepEqual(fish.examples, ['Lachs', 'Kabeljau']);
  assert.equal(presentCard(second, index.get('F02')).title, 'Fisch', 'gilt auch für die Familienkarte');
});

test('Meeresfrüchte bleiben in allen vier Runden aus Vorschlägen, Etiketten und Beispielen entfernt', () => {
  for (const selection of ['fixed', 'adaptive']) {
    for (const response of [LIKE, DISLIKE, UNFAMILIAR]) {
      const events = [{ type: 'HOLDOUT_DRAWN', cardIds: ['F02.1.1', 'F12.3'] }];
      let shown = 0;
      for (let round = 1; round <= 4; round += 1) {
        for (let position = 1; position <= 10; position += 1) {
          const current = state(events, noSeafood, round);
          const pending = selectNextCards(current, { ...config, selection });
          for (const raw of pending) {
            const card = presentCard(current, raw);
            assert.ok(!raw.animalOrigin.includes('seafood'), `${selection}, Runde ${round}: ${card.id}`);
            assert.doesNotMatch([card.title, card.group, ...card.examples].join(' '), /Meeresfrüchte|Garnelen|Krabben|Muscheln/i);
          }
          const card = nextCard(current, { ...config, selection });
          if (!card) break;
          events.push(answer(card.id, response, { round }));
          shown += 1;
        }
      }
      assert.ok(shown > 10, 'mehr als eine Runde geprüft');
    }
  }
});

test('Gruppennamen folgen auch Ausschlüssen beim Wischen und im Profil sowie Rückgängig', () => {
  const swipe = answer('F02', INTOLERANT, { excludedCardIds: ['F02.2', 'F02.3'] });
  assert.equal(presentCard(state([swipe]), index.get('F02.1')).group, 'Fisch');
  assert.equal(presentCard(state([swipe, answer('F02', UNDO)]), index.get('F02.1')).group, 'Fisch und Meeresfrüchte');
  const exclusions = [{ type: 'animalOrigin', value: 'seafood' }];
  const added = { type: 'EXCLUSION_ADDED', source: 'profile', section: 'never', exclusions };
  assert.equal(presentCard(state([added]), index.get('F02.1')).group, 'Fisch');
  const removed = { type: 'EXCLUSION_REMOVED', source: 'profile', section: 'never', exclusions };
  assert.equal(presentCard(state([added, removed]), index.get('F02.1')).group, 'Fisch und Meeresfrüchte');
  const noFish = { ...noOnboarding, exclusions: [{ type: 'allergen', value: 'fish' }] };
  assert.equal(presentCard(state([], noFish), index.get('F02.2')).group, 'Meeresfrüchte');
});

test('Runde 4 endet nach 13 Gerichten, lässt sich vorher fortsetzen und bietet keine fünfte Runde an', () => {
  const config = { roundCardLimit: 13 };
  const cards = selectNextCards(state([]), { roundCardLimit: 100 });
  const events = cards.slice(0, 30).map((card, i) => answer(card.id, LIKE, { round: 1 + Math.floor(i / 10) }));
  const third = state(events, noOnboarding, 3);
  const fourth = state(events, noOnboarding, 4);
  assert.equal(hasMoreCards(third), true);
  assert.deepEqual(nextRoundCards(third, config), selectNextCards(fourth, config));
  assert.equal(selectNextCards(fourth, config).length, 13, 'dasselbe Kartenlimit wie in den Vorrunden');
  assert.equal(isRoundComplete(fourth, config), false);
  assert.equal(hasMoreCards(fourth), false);
  assert.deepEqual(nextRoundCards(fourth, config), []);
  // Nach zehn Gerichten noch begonnen: drei Plätze bleiben bis zum regulären Abschluss.
  const ten = state([...events, ...selectNextCards(fourth, config).slice(0, 10).map((card) => answer(card.id, LIKE, { round: 4 }))], noOnboarding, 4);
  assert.equal(roundStatus(ten, config), ROUND_STATUS.STARTED);
  assert.equal(canResumeRound(ten, config), true);
  assert.equal(selectNextCards(ten, config).length, 3);
  assert.deepEqual(progress(ten, config), { answered: 10, total: 13, percent: 77 });

  events.push(...selectNextCards(fourth, config).map((card) => answer(card.id, LIKE, { round: 4 })));
  const done = state(events, noOnboarding, 4);
  assert.equal(isRoundComplete(done, config), true);
  assert.equal(canResumeRound(done, config), false, 'nichts mehr zum Fortsetzen');
  assert.deepEqual(progress(done, config), { answered: 13, total: 13, percent: 100 });
  assert.ok(index.cards.some((card) => !(card.id in done.answers)), 'weitere Karten bleiben bewusst offen');
  assert.equal(hasMoreCards(done), false);
  assert.deepEqual(nextRoundCards(done, config), []);
  assert.equal(buildProfile(done).taste.LIKE.length, done.sequence.length);

  const fifth = state(events, noOnboarding, 5);
  assert.equal(nextCard(fifth, config), null);
  assert.deepEqual(selectNextCards(fifth, config), []);
  assert.equal(isRoundComplete(fifth, config), true);
});

test('Gerichte werden nach zulässigen Vorlieben sortiert und übertragen keine Bewertung auf Zutaten', () => {
  const fourth = state([answer('F08.1', PREFER, { round: 2 })], noOnboarding, 4);
  const offered = selectNextCards(fourth, { roundCardLimit: 15 });
  assert.ok(offered.every((card) => card.stage === 4));
  assert.ok(offered.some((card) => card.id === 'D10'), 'Reisvorliebe nimmt Pilzrisotto in die Auswahl auf');
  assert.deepEqual(offered, openDishes(fourth).slice(0, 15), 'die 15 passendsten Gerichte aus dem gesamten Katalog');
  const meatHater = state([answer('F01', DISLIKE, { round: 1 }), answer('F09', LIKE, { round: 1 })], noOnboarding, 4);
  const ids = openDishes(meatHater).map((card) => card.id);
  assert.deepEqual(selectNextCards(meatHater, config).map((card) => card.id), ids.slice(0, 10), 'nur die zehn passendsten Gerichte im Budget');
  assert.ok(ids.indexOf('D05') < ids.indexOf('D02') && ids.indexOf('D12') < ids.indexOf('D16'), 'Rösti und Schnitzel (Kartoffeln) vor Bolognese und Poulet-Curry (Fleisch überwiegt)');
  const vegetarian = state([], { ...noOnboarding, diet: 'vegetarian' }, 4);
  assert.ok(selectNextCards(vegetarian, { roundCardLimit: 15 }).every((card) => !card.animalOrigin.some((origin) => ['meat', 'pork', 'fish', 'seafood'].includes(origin))));
  const after = state([answer('D01', PREFER, { round: 4 })], noOnboarding, 4);
  assert.equal(after.ratings['F04.2.3'], undefined, 'Pizza macht Frischkäse nicht zum Favoriten');
  assert.ok(!buildProfile(after).predicted.some((entry) => entry.basisId === 'D01'));
});

test('Gerichte nutzen Antworten aus Runde 1 bis 3; konkrete Zutaten haben Vorrang vor ihrer Gruppe', () => {
  const events = [answer('F01', DISLIKE, { round: 1 }), answer('F01.1', PREFER, { round: 2 }), answer('F01.1.1', DISLIKE, { round: 3 })];
  const chickenCurry = index.get('D16');
  const group = state(events.slice(0, 1), noOnboarding, 4);
  const subgroup = state(events.slice(0, 2), noOnboarding, 4);
  const food = state(events, noOnboarding, 4);
  assert.equal(dishAffinity(group, chickenCurry), -0.5, 'Runde 1: Fleisch eher ungern');
  assert.equal(dishAffinity(subgroup, chickenCurry), 1, 'Runde 2: Geflügel sehr gern überschreibt Fleisch');
  assert.equal(dishAffinity(food, chickenCurry), -0.5, 'Runde 3: Poulet ungern überschreibt Geflügel');
  assert.ok(selectNextCards(subgroup).some((card) => card.id === 'D16'), 'Geflügelvorliebe wählt Poulet-Curry aus');
  assert.ok(!selectNextCards(food).some((card) => card.id === 'D16'), 'konkrete Ablehnung lässt besser passende Gerichte vorrücken');
  const unknown = state([...events.slice(0, 2), answer('F01.1.1', UNFAMILIAR, { round: 3 })], noOnboarding, 4);
  assert.equal(dishAffinity(unknown, chickenCurry), 1, 'unbekannt zählt nicht als Ablehnung');
});

test('Runde 4 behält ihr Budget bei gemischten Antworten, Rückgängig und alten längeren Sitzungen', () => {
  for (const limit of [10, 13, 15]) {
    const config = { roundCardLimit: limit };
    const events = [];
    const expected = selectNextCards(state(events, noOnboarding, 4), config).map((card) => card.id);
    for (let i = 0; i < limit; i += 1) {
      const current = state(events, noOnboarding, 4);
      assert.equal(progress(current, config).total, limit);
      assert.equal(selectNextCards(current, config).length, limit - i);
      const card = nextCard(current, config);
      assert.equal(card.id, expected[i], 'bewertete Gerichte verändern keine Zutatenvorlieben');
      events.push(answer(card.id, [LIKE, DISLIKE, PREFER, UNFAMILIAR, INTOLERANT][i % 5], { round: 4 }));
    }
    assert.equal(nextCard(state(events, noOnboarding, 4), config), null);
    const undone = state([...events, answer(events.at(-1).cardId, UNDO, { round: 4 })], noOnboarding, 4);
    assert.deepEqual(selectNextCards(undone, config).map((card) => card.id), [events.at(-1).cardId]);
    assert.equal(progress(undone, config).total, limit);
  }
  const old = index.cards.filter((card) => card.stage === 4).slice(0, 30).map((card) => answer(card.id, LIKE, { round: 4 }));
  const resumed = state(old, noOnboarding, 4);
  assert.equal(resumed.roundSequence.length, 30, 'gespeicherte Antworten bleiben erhalten');
  assert.equal(nextCard(resumed), null, 'eine bereits längere Runde wird nicht weiter verlängert');
  assert.equal(canResumeRound(resumed), false);
  assert.deepEqual(progress(resumed), { answered: 30, total: 30, percent: 100 });
});

test('Rundenstatus: vorzeitig beendet bleibt „begonnen“, nach dem Fortsetzen bis zum Limit „abgeschlossen“', () => {
  const limit = { roundCardLimit: 4 };
  assert.equal(roundStatus(state([]), limit), ROUND_STATUS.OPEN);
  const events = [];
  for (let i = 0; i < 2; i += 1) events.push(answer(nextCard(state(events), limit).id, LIKE, { round: 1 }));
  // „Runde beenden“ mit offener Karte: Abbruch im Log, Runde bleibt begonnen und lässt sich fortsetzen
  events.push({ type: 'QUESTION_ABORTED', cardId: nextCard(state(events), limit).id, round: 1 });
  assert.equal(roundStatus(state(events), limit), ROUND_STATUS.STARTED);
  assert.equal(canResumeRound(state(events), limit), true);
  // Fortsetzen bis zum Kartenlimit
  for (let i = 0; i < 2; i += 1) events.push(answer(nextCard(state(events), limit).id, LIKE, { round: 1 }));
  assert.equal(roundStatus(state(events), limit), ROUND_STATUS.COMPLETED);
  assert.equal(canResumeRound(state(events), limit), false);
  assert.ok(events.some((event) => event.type === 'QUESTION_ABORTED'), 'das vorzeitige Ende bleibt im Log');
});

test('Rundenstatus: ohne offene Karte abgeschlossen; Fortsetzen nur, solange die nächste Runde unberührt ist', () => {
  const limit = { roundCardLimit: 4 };
  const events = [answer(nextCard(state([]), limit).id, LIKE, { round: 1 })];
  assert.equal(canResumeRound(state(events), limit), true);
  events.push(answer(nextCard(state(events, noOnboarding, 2), limit).id, LIKE, { round: 2 }));
  assert.equal(roundStatus(state(events), limit), ROUND_STATUS.STARTED, 'bleibt begonnen');
  assert.equal(canResumeRound(state(events), limit), false, 'Runde 2 hat schon eine Antwort');
  // Keine Karte mehr übrig (alles ausgeschlossen): abgeschlossen, auch wenn das Limit nicht erreicht ist
  const big = { roundCardLimit: 15 };
  const families = selectNextCards(state([]), big);
  const played = families.map((card) => answer(card.id, LIKE, { round: 1 }));
  assert.ok(played.length < 15);
  assert.equal(roundStatus(state(played), big), ROUND_STATUS.COMPLETED);
});
