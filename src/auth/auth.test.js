import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanCode, createAuthService, RESEND_DELAY_MS, resendSecondsLeft } from './AuthService.js';
import { MockAuthService } from './MockAuthService.js';
import { countryById, formatPhoneInput, maskPhone, validatePhone } from './phone.js';

const CH = countryById('CH');

// Simulierter Dienst ohne Wartezeit und mit steuerbarer Uhr
function service(start = 1_000_000) {
  let now = start;
  const auth = new MockAuthService({ wait: async () => {}, now: () => now, resendDelayMs: RESEND_DELAY_MS });
  const received = [];
  auth.onSimulatedSms((sms) => received.push(sms.code));
  return { auth, received, advance: (ms) => (now += ms), now: () => now };
}

test('Handynummer: Formatierung während der Eingabe (Schweiz, Standard +41)', () => {
  assert.equal(countryById('XX').id, 'CH', 'Standard ist die Schweiz');
  assert.equal(formatPhoneInput('0791234567', CH), '079 123 45 67');
  assert.equal(formatPhoneInput('079', CH), '079');
  assert.equal(formatPhoneInput('0791', CH), '079 1');
  assert.equal(formatPhoneInput('791234567', CH), '079 123 45 67', 'ohne führende 0');
  assert.equal(formatPhoneInput('+41 79 123 45 67', CH), '079 123 45 67', 'eingefügt mit Vorwahl');
  assert.equal(formatPhoneInput('0041791234567', CH), '079 123 45 67');
  assert.equal(formatPhoneInput('079 123 45 67 89', CH), '079 123 45 67', 'nicht länger als möglich');
  assert.equal(formatPhoneInput('', CH), '');
});

test('Handynummer: Prüfung mit verständlichem Grund', () => {
  assert.deepEqual(validatePhone('079 123 45 67', CH), { ok: true, e164: '+41791234567' });
  assert.deepEqual(validatePhone('', CH), { ok: false, error: 'empty' });
  assert.deepEqual(validatePhone('079 123', CH), { ok: false, error: 'too_short' });
  assert.deepEqual(validatePhone('044 123 45 67', CH), { ok: false, error: 'not_mobile' }, 'Festnetz bekommt keine SMS');
  assert.equal(validatePhone('abc', CH).error, 'empty');
  assert.equal(validatePhone('0151 2345 6789', countryById('DE')).ok, true);
  assert.equal(validatePhone('0151 23', countryById('DE')).error, 'too_short');
});

test('Handynummer wird nach der Bestätigung nur maskiert behalten', () => {
  assert.equal(maskPhone('+41791234567'), '+41 79 *** ** 67');
  const masked = maskPhone('+491512345678');
  assert.ok(masked.startsWith('+49 15 ') && masked.endsWith(' 78'));
  assert.ok(!masked.includes('234567'));
});

test('SMS-Code: zufällig, 6 Ziffern, nur in der Simulation sichtbar', async () => {
  const { auth, received } = service();
  const first = await auth.sendCode('+41791234567');
  const second = await auth.sendCode('+41791234567');
  assert.equal(received.length, 2);
  for (const code of received) assert.match(code, /^\d{6}$/);
  assert.notEqual(first.requestId, second.requestId);
  assert.equal(cleanCode('12 34-56 7'), '123456', 'Einfügen aus der Zwischenablage');
  assert.equal(createAuthService() instanceof MockAuthService, true);
});

test('Falscher Code wird abgelehnt, richtiger Code führt weiter', async () => {
  const { auth, received } = service();
  const request = await auth.sendCode('+41791234567');
  const wrong = received[0] === '000000' ? '111111' : '000000';
  assert.deepEqual(await auth.verifyCode(request.requestId, wrong), { ok: false, reason: 'wrong' });
  assert.deepEqual(await auth.verifyCode(request.requestId, received[0]), { ok: true });
  assert.deepEqual(await auth.verifyCode('unbekannt', received[0]), { ok: false, reason: 'unknown' });
});

test('„Code erneut senden“ erst nach 30 Sekunden', async () => {
  const { auth, advance, now } = service();
  const request = await auth.sendCode('+41791234567');
  assert.equal(request.resendAvailableAt - request.sentAt, 30_000);
  assert.equal(resendSecondsLeft(request.resendAvailableAt, now()), 30);
  advance(12_400);
  assert.equal(resendSecondsLeft(request.resendAvailableAt, now()), 18);
  advance(17_600);
  assert.equal(resendSecondsLeft(request.resendAvailableAt, now()), 0);
});

test('Ein abgelaufener Code gilt nicht mehr', async () => {
  const { auth, received, advance } = service();
  const request = await auth.sendCode('+41791234567');
  advance(11 * 60_000);
  assert.deepEqual(await auth.verifyCode(request.requestId, received[0]), { ok: false, reason: 'expired' });
});
