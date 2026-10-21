// Bilder auf den Karten (Addendum A15): Platzhalter, Ladefehler, Wartezeit, Antwortzeit und Vorladen.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buttonByText, click, render, setupDom } from '../test/dom.js';

const dom = setupDom();
after(() => dom.window.close());
const { createElement: h, act } = await import('react');
const { default: Artwork } = await import('./Artwork.jsx');
const { default: SwipeCard } = await import('./SwipeCard.jsx');
const { default: RoundScreen } = await import('../screens/RoundScreen.jsx');
const { ANSWER_LABELS, ROUND } = await import('../labels.js');
const { LIKE } = await import('../logic/answers.js');
const { indexCatalog } = await import('../logic/catalog.js');
const { deriveRoundState, presentCard, selectNextCards } = await import('../logic/engine.js');
const { imageUrls } = await import('../lib/images.js');

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const { diets } = read('../data/stage0.json');
const onboarding = { diet: null, exclusions: [], cardLabels: {} };
const config = { roundCardLimit: 13 };
// Runde 2 nach „Mag ich“ für alle Gruppen: Untergruppen mit Bild
const families = index.cards.filter((card) => card.stage === 1).map((card, i) => ({ cardId: card.id, response: LIKE, round: 1, positionInRound: i + 1 }));
const roundTwo = () => deriveRoundState({ index, onboarding, diets, events: families, round: 2 });

function spy() {
  const calls = [];
  const fn = (...args) => calls.push(args);
  fn.calls = calls;
  return fn;
}

async function withClock(run) {
  const clock = { now: 1000 };
  const original = Object.getOwnPropertyDescriptor(performance, 'now') ?? { value: performance.now, configurable: true, writable: true };
  Object.defineProperty(performance, 'now', { value: () => clock.now, configurable: true, writable: true });
  try {
    await run(clock);
  } finally {
    Object.defineProperty(performance, 'now', original);
  }
}

const fire = (node, type, init = {}) => act(async () => node.dispatchEvent(new window.MouseEvent(type, { bubbles: true, cancelable: true, ...init })));

test('Karte ohne Bild: neutraler Platzhalter mit Kartenname, die Karte bleibt wischbar', async () => {
  // Skyr steht auf der Liste „ohne passendes Bild“ (A16)
  const skyr = index.get('F04.1.2');
  assert.equal(skyr.image, undefined);
  const onCommitted = spy();
  const { container, unmount } = await render(h(SwipeCard, { card: skyr, onCommitted, onIntent() {} }));
  assert.equal(container.querySelector('.artwork').dataset.state, 'missing');
  assert.equal(container.querySelector('.artwork-name').textContent, 'Skyr');
  assert.equal(container.querySelector('.artwork-photo'), null);
  assert.equal(container.querySelector('.card-title').textContent, 'Skyr', 'Kartenname als echter Text unter dem Bild');
  const card = container.querySelector('.swipe-card');
  await fire(card, 'pointerdown', { clientX: 100, clientY: 200, button: 0 });
  await fire(card, 'pointermove', { clientX: 400, clientY: 205 });
  await fire(card, 'pointerup', { clientX: 400, clientY: 205 });
  assert.deepEqual(onCommitted.calls.map(([answer, method]) => [answer, method]), [[LIKE, 'swipe']]);
  await unmount();
});

test('Fehlerhafter Bildpfad: Platzhalter statt kaputtem Bild, kein Absturz; gemeldet als nicht gezeigt', async () => {
  const chicken = index.get('F01.1');
  const broken = { ...chicken, image: { ...chicken.image, src: 'cards/gibt-es-nicht.webp' } };
  const onStatus = spy();
  const { container, unmount } = await render(h(Artwork, { card: broken, onStatus }));
  const image = container.querySelector('.artwork-photo');
  assert.ok(image.getAttribute('src').endsWith('cards/gibt-es-nicht.webp'));
  assert.equal(onStatus.calls.length, 0, 'noch nicht sichtbar, solange das Bild lädt');
  await act(async () => image.dispatchEvent(new window.Event('error')));
  assert.equal(container.querySelector('.artwork').dataset.state, 'error');
  assert.equal(container.querySelector('.artwork-photo'), null);
  assert.equal(container.querySelector('.artwork-name').textContent, 'Geflügel');
  assert.deepEqual(onStatus.calls.map(([status]) => status), [{ cardId: 'F01.1', imageShown: false, imageSource: 'stock' }]);
  await unmount();
});

test('Bild geladen: alt-Text aus dem Katalog; zu langes Laden: Platzhalter, auch wenn das Bild später kommt', async () => {
  const chicken = index.get('F01.1');
  const loaded = spy();
  const first = await render(h(Artwork, { card: chicken, onStatus: loaded }));
  const image = first.container.querySelector('.artwork-photo');
  assert.equal(image.getAttribute('alt'), chicken.image.alt);
  await act(async () => image.dispatchEvent(new window.Event('load')));
  assert.equal(first.container.querySelector('.artwork').dataset.state, 'loaded');
  assert.deepEqual(loaded.calls.map(([status]) => status), [{ cardId: 'F01.1', imageShown: true, imageSource: 'stock' }]);
  await first.unmount();

  const slow = spy();
  const second = await render(h(Artwork, { card: chicken, onStatus: slow, timeoutMs: 20 }));
  const late = second.container.querySelector('.artwork-photo');
  await act(async () => new Promise((resolve) => setTimeout(resolve, 60)));
  assert.equal(second.container.querySelector('.artwork').dataset.state, 'timeout');
  await act(async () => late.dispatchEvent(new window.Event('load')));
  assert.equal(second.container.querySelector('.artwork').dataset.state, 'timeout', 'kein Wechsel mehr, die Karte bleibt ruhig');
  assert.deepEqual(slow.calls.map(([status]) => status.imageShown), [false]);
  await second.unmount();
});

test('Antwortzeit beginnt erst, wenn das Bild geladen ist; Antwort davor: keine Zeit, Bild nicht gezeigt', async () => {
  const round = roundTwo();
  const first = presentCard(round, selectNextCards(round, config)[0]);
  assert.ok(first.image, `${first.id}: Runde 2 beginnt mit einer Karte mit Bild`);
  await withClock(async (clock) => {
    const onAnswer = spy();
    const { container, unmount } = await render(h(RoundScreen, { round, config, canUndo: false, onAnswer, onUndo() {}, onEndRound() {} }));
    clock.now = 5000;
    await act(async () => container.querySelector('.swipe-card .artwork-photo').dispatchEvent(new window.Event('load')));
    clock.now = 6000;
    await click(buttonByText(container, ANSWER_LABELS.LIKE));
    assert.equal(onAnswer.calls[0][3], 1000, 'ab dem Laden des Bildes, nicht ab dem Erscheinen der Karte');
    assert.deepEqual(onAnswer.calls[0][7], { imageShown: true, imageSource: 'stock' });
    await unmount();

    clock.now = 10000;
    const early = spy();
    const second = await render(h(RoundScreen, { round, config, canUndo: false, onAnswer: early, onUndo() {}, onEndRound() {} }));
    clock.now = 10500;
    await click(buttonByText(second.container, ANSWER_LABELS.LIKE));
    assert.equal(early.calls[0][3], null, 'Karte war nie vollständig sichtbar');
    assert.deepEqual(early.calls[0][7], { imageShown: false, imageSource: 'stock' });
    await second.unmount();
  });
});

test('Platzhalter gilt als sichtbar: Karte ohne Bild misst ab dem Erscheinen; „Runde beenden“ meldet das Bild', async () => {
  await withClock(async (clock) => {
    const round = deriveRoundState({ index, onboarding, diets, events: [], round: 1 });
    const onAnswer = spy();
    const onEndRound = spy();
    const { container, unmount } = await render(h(RoundScreen, { round, config, canUndo: false, onAnswer, onUndo() {}, onEndRound }));
    clock.now = 2500;
    await click(buttonByText(container, ROUND.endRound));
    assert.deepEqual(onEndRound.calls[0][0], { imageShown: true, imageSource: 'own' }, 'Gruppe: neutrales Symbol');
    await click(buttonByText(container, 'Eher gern'));
    assert.equal(onAnswer.calls[0][3], 1500);
    await unmount();
  });
});

test('Die nächsten zwei Karten werden vorgeladen', async () => {
  const requested = [];
  const original = globalThis.Image;
  globalThis.Image = class {
    set src(value) {
      requested.push(value);
    }
  };
  try {
    const round = roundTwo();
    const expected = imageUrls(selectNextCards(round, config).slice(1, 3).map((entry) => presentCard(round, entry)), { style: 'photo', filter: null });
    assert.ok(expected.length > 0, 'die nächsten Karten haben Bilder');
    const { unmount } = await render(h(RoundScreen, { round, config, canUndo: false, onAnswer() {}, onUndo() {}, onEndRound() {} }));
    assert.deepEqual(requested, expected);
    await unmount();
  } finally {
    globalThis.Image = original;
  }
});
