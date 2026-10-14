import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buttonByText, click, render, setupDom } from '../test/dom.js';

// DOM zuerst, dann React laden (react-dom prüft beim Import, ob es ein DOM gibt).
const dom = setupDom();
after(() => dom.window.close());
const { createElement: h } = await import('react');
const { default: AnswerButtons } = await import('./AnswerButtons.jsx');
const { default: RoundScreen } = await import('../screens/RoundScreen.jsx');
const { ANSWER_LABELS, ROUND } = await import('../labels.js');
const { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } = await import('../logic/answers.js');
const { indexCatalog } = await import('../logic/catalog.js');
const { deriveRoundState } = await import('../logic/engine.js');

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
    await click(buttonByText(container, ANSWER_LABELS[answer]));
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
  const pork = [...sheet.querySelectorAll('label.choice')].find((label) => label.textContent.includes('Schwein'));
  await click(pork.querySelector('input'));
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
