import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { click, render, setupDom } from '../test/dom.js';

const dom = setupDom();
after(() => dom.window.close());
const { createElement: h } = await import('react');
const { default: PracticalScreen } = await import('./PracticalScreen.jsx');
const { PRACTICAL } = await import('../labels.js');

const definition = JSON.parse(readFileSync(new URL('../data/practical.json', import.meta.url), 'utf8'));
const buttonByText = (root, text) => [...root.querySelectorAll('button')].find((button) => button.textContent.trim() === text);

test('Alltagsprofil: eine Frage pro Bildschirm, überspringbar, gespeichert erst mit „Fertig“', async () => {
  const saved = [];
  let cancelled = 0;
  const view = await render(h(PracticalScreen, { definition, initial: null, onSave: (practical) => saved.push(practical), onCancel: () => (cancelled += 1) }));
  const { container } = view;
  assert.ok(container.textContent.includes(definition.questions[0].title));
  // Kochzeit werktags wählen
  const weekday = [...container.querySelectorAll('label.choice')].find((label) => label.textContent.includes('15 bis 30 Minuten'));
  await click(weekday.querySelector('input'));
  await click(buttonByText(container, PRACTICAL.next));
  // Küchengeräte überspringen, dann alle übrigen
  assert.ok(container.textContent.includes(definition.questions[1].title));
  for (let i = 1; i < definition.questions.length; i += 1) await click(buttonByText(container, PRACTICAL.skip));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].cookingTime.weekday, 'short');
  assert.equal(saved[0].appliances, null, 'übersprungen = unbekannt');
  assert.equal(cancelled, 0);
  await view.unmount();

  // Zurück auf der ersten Frage schliesst ohne zu speichern
  const again = await render(h(PracticalScreen, { definition, initial: null, onSave: () => saved.push('x'), onCancel: () => (cancelled += 1) }));
  await click(again.container.querySelector('.top-bar button, button'));
  assert.equal(cancelled, 1);
  assert.equal(saved.length, 1);
  await again.unmount();
});
