// Anmeldung nur mit dem Vornamen (Teamentscheid 28.10.2026): keine Handynummer, kein SMS-Code.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { buttonByText, click, render, setupDom, type } from '../test/dom.js';

const dom = setupDom();
after(() => dom.window.close());
const { createElement: h, useState } = await import('react');
const { default: RegisterNameScreen } = await import('./RegisterNameScreen.jsx');
const { REGISTER } = await import('../labels.js');

function Flow({ onNext }) {
  const [firstName, setFirstName] = useState('');
  return h(RegisterNameScreen, { firstName, onChange: setFirstName, onNext, onBack() {} });
}

test('Anmeldung: nur der Vorname, ohne Nummer; leer gibt es eine Fehlermeldung, sonst geht es weiter', async () => {
  const names = [];
  const { container, unmount } = await render(h(Flow, { onNext: (name) => names.push(name) }));
  assert.equal(container.querySelectorAll('input').length, 1, 'genau ein Eingabefeld');
  assert.equal(container.querySelector('input').getAttribute('autocomplete'), 'given-name');
  assert.equal(container.querySelector('input[type="tel"]'), null, 'kein Feld für eine Handynummer');
  assert.ok(!/Code senden|SMS-Code|Ländervorwahl/.test(container.textContent), 'kein SMS-Code');
  assert.ok(container.textContent.includes(REGISTER.namePrivacy));
  await click(buttonByText(container, REGISTER.nameNext));
  assert.ok(container.querySelector('[role="alert"]'), 'leerer Vorname: Fehlermeldung');
  assert.deepEqual(names, []);
  await type(container.querySelector('input'), '  Annelies ');
  await click(buttonByText(container, REGISTER.nameNext));
  assert.deepEqual(names, ['Annelies'], 'Vorname ohne Leerzeichen weitergegeben');
  await unmount();
});
