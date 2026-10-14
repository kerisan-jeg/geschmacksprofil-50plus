import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { buttonByText, render, setupDom, type } from '../test/dom.js';

const dom = setupDom();
after(() => dom.window.close());
const { act, createElement: h, useState } = await import('react');
const { default: RegisterCodeScreen } = await import('./RegisterCodeScreen.jsx');
const { default: RegisterPhoneScreen } = await import('./RegisterPhoneScreen.jsx');
const { MockAuthService } = await import('../auth/MockAuthService.js');
const { REGISTER } = await import('../labels.js');

async function setup() {
  let now = 1_000_000;
  const clock = () => now;
  const auth = new MockAuthService({ wait: async () => {}, now: clock });
  const codes = [];
  auth.onSimulatedSms((sms) => codes.push(sms.code));
  const request = await auth.sendCode('+41791234567');
  return { auth, codes, request, clock, advance: (ms) => (now += ms) };
}

// Nach erfolgreicher Prüfung zeigt die Hülle „weiter“ an, wie App.jsx den nächsten Bildschirm.
function Flow({ auth, request, clock }) {
  const [done, setDone] = useState(false);
  const [current, setCurrent] = useState(request);
  if (done) return h('p', { id: 'next' }, 'weiter');
  return h(RegisterCodeScreen, {
    phoneDisplay: '+41 79 123 45 67',
    request: current,
    clock,
    onBack: () => {},
    onResend: async () => {
      const next = await auth.sendCode('+41791234567');
      setCurrent(next);
      return next;
    },
    onVerify: async (code) => {
      const result = await auth.verifyCode(current.requestId, code);
      if (result.ok) setDone(true);
      return result;
    },
  });
}

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

test('Falscher Code: verständliche Fehlermeldung, kein Weiter', async () => {
  const { auth, codes, request, clock } = await setup();
  const { container, unmount } = await render(h(Flow, { auth, request, clock }));
  const input = container.querySelector('#register-code');
  assert.equal(input.getAttribute('autocomplete'), 'one-time-code');
  assert.equal(input.getAttribute('inputmode'), 'numeric');
  const wrong = codes[0] === '000000' ? '111111' : '000000';
  await type(input, wrong);
  await settle();
  assert.ok(container.textContent.includes(REGISTER.codeWrong));
  assert.equal(container.querySelector('#next'), null);
  await unmount();
});

test('Gültiger Code (auch eingefügt mit Leerzeichen) führt automatisch weiter', async () => {
  const { auth, codes, request, clock } = await setup();
  const { container, unmount } = await render(h(Flow, { auth, request, clock }));
  const pasted = `${codes[0].slice(0, 3)} ${codes[0].slice(3)}`;
  await type(container.querySelector('#register-code'), pasted);
  await settle();
  assert.ok(container.querySelector('#next'), 'ohne Knopfdruck weiter');
  await unmount();
});

test('„Code erneut senden“ erst nach 30 Sekunden, Countdown läuft sichtbar', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { auth, codes, request, clock, advance } = await setup();
  const { container, unmount } = await render(h(Flow, { auth, request, clock }));
  const resend = () => container.querySelector('.resend-button');
  assert.equal(resend().disabled, true);
  assert.ok(resend().textContent.includes(REGISTER.resendIn(30)));
  advance(12_000);
  await act(async () => t.mock.timers.tick(1000));
  assert.ok(resend().textContent.includes(REGISTER.resendIn(18)));
  assert.equal(resend().disabled, true);
  advance(18_000);
  await act(async () => t.mock.timers.tick(1000));
  assert.equal(resend().disabled, false);
  assert.equal(buttonByText(container, REGISTER.resend), resend());
  await act(async () => resend().dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  await settle();
  assert.equal(codes.length, 2, 'neuer Code verschickt (simuliert)');
  assert.equal(resend().disabled, true, 'Countdown beginnt von vorn');
  // Der alte Code gilt nicht mehr für die neue Anfrage, der neue schon
  await type(container.querySelector('#register-code'), codes[1]);
  await settle();
  assert.ok(container.querySelector('#next'));
  await unmount();
});

test('Handynummer: Formatierung beim Tippen und Fehlermeldung bei falscher Nummer', async () => {
  const sent = [];
  function PhoneFlow() {
    const [value, setValue] = useState({ country: 'CH', phoneInput: '' });
    return h(RegisterPhoneScreen, {
      ...value,
      onChange: (changes) => setValue((current) => ({ ...current, ...changes })),
      onSend: async (e164) => sent.push(e164),
      onBack: () => {},
    });
  }
  const { container, unmount } = await render(h(PhoneFlow));
  const input = container.querySelector('#register-phone');
  assert.equal(input.getAttribute('inputmode'), 'tel');
  assert.equal(container.querySelector('select').value, 'CH', 'Standard +41');
  await type(input, '0791234567');
  assert.equal(input.value, '079 123 45 67');
  await type(input, '044 123 45 67');
  await act(async () => container.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  assert.ok(container.textContent.includes(REGISTER.phoneErrors.not_mobile));
  assert.deepEqual(sent, []);
  await type(input, '079 123 45 67');
  await act(async () => container.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  await settle();
  assert.deepEqual(sent, ['+41791234567']);
  await unmount();
});
