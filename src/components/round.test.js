import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buttonByText, click, render, setupDom } from '../test/dom.js';

// DOM zuerst, dann React laden (react-dom prüft beim Import, ob es ein DOM gibt).
const dom = setupDom();
after(() => dom.window.close());
const { createElement: h, act } = await import('react');
const { default: AnswerButtons } = await import('./AnswerButtons.jsx');
const { default: RoundScreen } = await import('../screens/RoundScreen.jsx');
const { ANSWER_LABELS, ROUND } = await import('../labels.js');
const { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } = await import('../logic/answers.js');
const { indexCatalog } = await import('../logic/catalog.js');
const { deriveRoundState } = await import('../logic/engine.js');
const { labelShown } = await import('../logic/scale.js');
const { ImageFilterContext } = await import('../lib/images.js');

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const { diets } = read('../data/stage0.json');
const config = { roundCardLimit: 13, tutorial: false };
const onboarding = { diet: null, exclusions: [], cardLabels: {} };
const roundAfter = (cardIds) => deriveRoundState({ index, onboarding, diets, events: cardIds.map((cardId) => ({ cardId, response: LIKE })) });

function spy() {
  const calls = [];
  const fn = (...args) => calls.push(args);
  fn.calls = calls;
  return fn;
}

test('Jede Antwort hat einen Knopf: drei Richtungen, Kenne ich nicht und der Link Vertrage ich nicht', async () => {
  const onAnswer = spy();
  const onIntolerant = spy();
  const { container, unmount } = await render(h(AnswerButtons, { onAnswer, onIntolerant, intent: null }));
  for (const answer of [DISLIKE, PREFER, LIKE, UNFAMILIAR]) {
    await click(buttonByText(container, ANSWER_LABELS[answer]));
  }
  assert.deepEqual(onAnswer.calls.map(([answer]) => answer), [DISLIKE, PREFER, LIKE, UNFAMILIAR]);
  await click(buttonByText(container, ANSWER_LABELS.INTOLERANT));
  assert.equal(onIntolerant.calls.length, 1);
  // Reihenfolge wie die Wischrichtungen: links, oben (Mitte), rechts
  const row = [...container.querySelectorAll('.answer-row button')].map((button) => button.dataset.answer);
  assert.deepEqual(row, [DISLIKE, PREFER, LIKE]);
  // „Vertrage ich nicht“ ist ein dezenter Textlink, kein fünfter gleichwertiger Knopf
  assert.ok(buttonByText(container, ANSWER_LABELS.INTOLERANT).classList.contains('button-link'));
  await unmount();
});

test('In der Runde lösen alle Knöpfe die passende Antwort aus (inputMethod button bzw. link)', async () => {
  for (const answer of [DISLIKE, PREFER, LIKE, UNFAMILIAR]) {
    const onAnswer = spy();
    const { container, unmount } = await render(h(RoundScreen, { round: roundAfter([]), config, canUndo: false, onAnswer, onUndo: spy(), onEndRound: spy() }));
    // Runde 1: Begriffe der Variante r1-3 („Eher ungern / Eher gern / Sehr gern“)
    await click(buttonByText(container, labelShown('r1-3', answer)));
    assert.equal(onAnswer.calls.length, 1, answer);
    const [card, response, inputMethod, , position] = onAnswer.calls[0];
    assert.deepEqual([card.id, response, inputMethod, position], ['F01', answer, 'button', 1]);
    await unmount();
  }
});

test('Vertrage ich nicht: Einzelkarte direkt, Familienkarte über die Detailauswahl', async () => {
  // F03 (Eier) hat keine Kinder: Ausschluss gilt direkt für die Karte
  const direct = spy();
  const first = await render(h(RoundScreen, { round: roundAfter(['F01', 'F02']), config, canUndo: true, onAnswer: direct, onUndo: spy(), onEndRound: spy() }));
  await click(buttonByText(first.container, ANSWER_LABELS.INTOLERANT));
  const [card, response, inputMethod, , , excluded] = direct.calls[0];
  assert.deepEqual([card.id, response, inputMethod, excluded], ['F03', INTOLERANT, 'link', ['F03']]);
  await first.unmount();

  // F01 (Fleisch und Geflügel) hat Kinder: zuerst die Detailauswahl, nichts wird sofort ausgeschlossen
  const family = spy();
  const second = await render(h(RoundScreen, { round: roundAfter([]), config, canUndo: false, onAnswer: family, onUndo: spy(), onEndRound: spy() }));
  await click(buttonByText(second.container, ANSWER_LABELS.INTOLERANT));
  assert.equal(family.calls.length, 0);
  const sheet = document.querySelector('[role="dialog"]');
  assert.ok(sheet, 'Detailauswahl offen');
  // Seit Stufe 3 hat „Schwein“ eigene Einträge (Kotelett, Braten, Speck): „Alle Schwein“ wählt den Abschnitt
  const pork = [...sheet.querySelectorAll('button')].find((button) => button.textContent.includes('Alle Schwein'));
  await click(pork);
  await click(buttonByText(sheet, 'Übernehmen'));
  assert.deepEqual(family.calls[0].slice(1, 3), [INTOLERANT, 'link']);
  assert.deepEqual(family.calls[0][5], ['F01.3']);
  await second.unmount();
});

test('Rückgängig erscheint erst ab der ersten beantworteten Karte', async () => {
  const none = await render(h(RoundScreen, { round: roundAfter([]), config, canUndo: false, onAnswer: spy(), onUndo: spy(), onEndRound: spy() }));
  assert.equal(buttonByText(none.container, ROUND.undo), null);
  await none.unmount();
  const onUndo = spy();
  const some = await render(h(RoundScreen, { round: roundAfter(['F01']), config, canUndo: true, onAnswer: spy(), onUndo, onEndRound: spy() }));
  await click(buttonByText(some.container, ROUND.undo));
  assert.equal(onUndo.calls.length, 1);
  await some.unmount();
});

test('Die nächste Karte liegt sichtbar dahinter', async () => {
  const { container, unmount } = await render(h(RoundScreen, { round: roundAfter([]), config, canUndo: false, onAnswer: spy(), onUndo: spy(), onEndRound: spy() }));
  const behind = container.querySelector('.deck-behind');
  assert.ok(behind, 'Karte dahinter vorhanden');
  assert.equal(behind.getAttribute('aria-hidden'), 'true');
  assert.ok(behind.textContent.includes(index.get('F02').title));
  await unmount();
});

test('Runde 4 zeigt nach zehn Antworten Karte 11 von 13 ohne Nachfrage und endet nach Karte 13', async () => {
  const dishIds = index.cards.filter((card) => card.stage === 4).slice(0, 13).map((card) => card.id);
  const view = (count) => h(RoundScreen, {
    round: deriveRoundState({ index, onboarding, diets, round: 4, events: dishIds.slice(0, count).map((cardId) => ({ cardId, response: LIKE, round: 4 })) }),
    config, canUndo: true, onAnswer: spy(), onUndo: spy(), onEndRound: spy(),
  });
  const { container, rerender, unmount } = await render(view(10));
  assert.equal(container.querySelector('.progress-text').textContent, 'Karte 11 von 13');
  assert.equal(document.querySelector('[role="dialog"]'), null, 'kein Angebot, die Runde über das Limit zu verlängern');
  await rerender(view(12));
  assert.equal(container.querySelector('.progress-text').textContent, 'Karte 13 von 13');
  assert.equal(container.querySelector('.deck-behind'), null, 'keine vierzehnte Karte im Stapel');
  await rerender(view(13));
  assert.equal(container.querySelector('.swipe-card'), null);
  await unmount();
});

test('Runde 2 zeigt Fisch ohne Meeresfrüchte im Etikett, auch im Stapel und nach einem Bildfehler', async () => {
  const rules = { ...onboarding, exclusions: [{ type: 'animalOrigin', value: 'seafood' }] };
  const firstRound = Array.from({ length: 10 }, (_, i) => `F${String(i + 1).padStart(2, '0')}`)
    .map((cardId) => ({ cardId, response: LIKE, round: 1 }));
  const secondRound = ['F11', 'F12', 'F13', 'F01.1'].map((cardId) => ({ cardId, response: LIKE, round: 2 }));
  function viewFor(completed, appliedRules = rules) {
    const round = deriveRoundState({ index, onboarding: appliedRules, diets, events: [...firstRound, ...secondRound.slice(0, completed)], round: 2 });
    return h(ImageFilterContext.Provider, { value: { index, exclusions: round.exclusions } },
      h(RoundScreen, { round, config: { ...config, roundCardLimit: 10 }, canUndo: true, onAnswer() {}, onUndo() {}, onEndRound() {} }));
  }
  const { container, rerender, unmount } = await render(viewFor(3));
  assert.equal(container.querySelector('.deck-behind .card-kind').textContent, 'Fisch');
  await rerender(viewFor(4));
  const front = () => container.querySelector('.swipe-card');
  assert.equal(front().querySelector('.card-kind').textContent, 'Fisch');
  assert.equal(front().querySelector('.card-title').textContent, 'Fisch');
  assert.ok(front().querySelector('.card-examples').textContent.includes('Lachs, Kabeljau'));
  assert.equal(front().querySelector('.artwork-illustration'), null, 'kein Platzhalter mit Garnele während des Ladens');
  assert.ok(front().querySelector('.artwork-photo').getAttribute('src').endsWith('cards/F02.1.webp'), 'Bild der Karte (A15)');
  await act(async () => front().querySelector('.artwork-photo').dispatchEvent(new window.Event('error')));
  assert.equal(front().querySelector('.artwork').getAttribute('data-state'), 'error');
  assert.equal(front().querySelector('.artwork-name').textContent, 'Fisch', 'neutraler Platzhalter mit Kartenname bei Bildfehler');
  assert.equal(front().querySelector('.artwork-illustration'), null);
  await rerender(viewFor(4, onboarding));
  assert.equal(front().querySelector('.card-kind').textContent, 'Fisch und Meeresfrüchte', 'nach Entfernen des Ausschlusses wieder die ganze Gruppe');
  assert.equal(front().querySelector('.artwork').getAttribute('data-state'), 'error', 'ein fehlerhaftes Bild bleibt beim Platzhalter');
  await unmount();
});

test('Runde 1: eigene Begriffe und Rundenanzeige mit Zusatz, Einleitung nicht auf der Karte; ab Runde 2 die Begriffe aus A3', async () => {
  const { container, unmount } = await render(h(RoundScreen, { round: roundAfter([]), config, canUndo: false, onAnswer: spy(), onUndo: spy(), onEndRound: spy() }));
  const labels = [...container.querySelectorAll('.answer-row .answer-label')].map((node) => node.textContent);
  assert.deepEqual(labels, ['Eher ungern', 'Sehr gern', 'Eher gern']);
  assert.ok(container.textContent.includes('Runde 1 von 4 · Lebensmittelgruppen · erste grobe Einschätzung'));
  // Der ausführliche Satz steht auf der Zusammenfassung (kein Scrollen in der Runde)
  assert.ok(!container.textContent.includes(ROUND.round1Intro));
  assert.equal(container.querySelector('.card-examples'), null, 'keine Beispiele in Runde 1');
  // Seit dem 21.10.2026 mit Gruppenbild (GROUP_IMAGES), vorher das neutrale Symbol
  assert.ok(container.querySelector('.swipe-card .artwork-photo').getAttribute('src').endsWith('cards/F01.webp'), 'Gruppenbild');
  assert.equal(container.querySelector('.swipe-card .artwork-neutral'), null);
  await unmount();
  // Die Rundenanzeige bleibt auf jeder Karte gleich
  const later = await render(h(RoundScreen, { round: roundAfter(['F01']), config, canUndo: true, onAnswer: spy(), onUndo: spy(), onEndRound: spy() }));
  assert.ok(later.container.textContent.includes('Runde 1 von 4 · Lebensmittelgruppen · erste grobe Einschätzung'));
  await later.unmount();
  // Runde 2: Untergruppen mit den Begriffen aus A3
  const events = index.cards.filter((card) => card.stage === 1).map((card, i) => ({ cardId: card.id, response: LIKE, round: 1, positionInRound: i + 1 }));
  const round2 = deriveRoundState({ index, onboarding, diets, events, round: 2 });
  const second = await render(h(RoundScreen, { round: round2, config, canUndo: false, onAnswer: spy(), onUndo: spy(), onEndRound: spy() }));
  assert.deepEqual([...second.container.querySelectorAll('.answer-row .answer-label')].map((node) => node.textContent), [ANSWER_LABELS.DISLIKE, ANSWER_LABELS.PREFER, ANSWER_LABELS.LIKE]);
  assert.ok(second.container.textContent.includes('Runde 2 von 4 · Genauer nachgefragt'));
  assert.ok(!second.container.textContent.includes('erste grobe Einschätzung'));
  await second.unmount();
});

test('?r1scale=2: in Runde 1 nur „Eher ungern“ und „Eher gern“, Pfeil nach oben wirkt nicht', async () => {
  const onAnswer = spy();
  const { container, unmount } = await render(h(RoundScreen, { round: roundAfter([]), config: { ...config, r1scale: 2 }, canUndo: false, onAnswer, onUndo: spy(), onEndRound: spy() }));
  assert.deepEqual([...container.querySelectorAll('.answer-row button')].map((button) => button.dataset.answer), [DISLIKE, LIKE]);
  await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp' })));
  assert.equal(onAnswer.calls.length, 0);
  await click(buttonByText(container, 'Eher gern'));
  assert.deepEqual(onAnswer.calls[0].slice(1, 2).concat(onAnswer.calls[0][6]), [LIKE, 'r1-2']);
  await unmount();
});

test('Rundenübersicht während des Wischens: eigenes Navigationsereignis, Antwortzeit ohne die Zeit in der Übersicht', async () => {
  const { roundOverview } = await import('../logic/rounds.js');
  const { ROUNDS } = await import('../labels.js');
  let clock = 1000;
  const original = Object.getOwnPropertyDescriptor(performance, 'now') ?? { value: performance.now, configurable: true, writable: true };
  Object.defineProperty(performance, 'now', { value: () => clock, configurable: true, writable: true });
  try {
    const onAnswer = spy();
    const onNavigate = spy();
    const round = roundAfter([]);
    const rounds = roundOverview({ index, onboarding, diets, events: [], config });
    const { container, unmount } = await render(h(RoundScreen, { round, config, canUndo: false, onAnswer, onUndo: spy(), onEndRound: spy(), rounds, onNavigate }));
    // Gruppenbild geladen: Ab jetzt läuft die Antwortzeit (A15)
    await act(async () => container.querySelector('.swipe-card .artwork-photo').dispatchEvent(new window.Event('load')));
    clock = 3000;
    await click(container.querySelector('.round-title-button'));
    assert.ok(document.body.textContent.includes(ROUNDS.title));
    assert.ok(document.body.textContent.includes('Noch offen'));
    clock = 13000;
    await click(buttonByText(document.body, ROUNDS.backToCard));
    clock = 14000;
    await click(buttonByText(container, 'Eher gern'));
    assert.deepEqual(onNavigate.calls.map(([action]) => action), ['overview_open', 'overview_close']);
    // sichtbar 1000→3000 und 13000→14000: 3 Sekunden, nicht 13
    assert.equal(onAnswer.calls[0][3], 3000);
    await unmount();
  } finally {
    Object.defineProperty(performance, 'now', original);
  }
});
