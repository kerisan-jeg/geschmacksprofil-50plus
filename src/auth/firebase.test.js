import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FirebaseAuthService, SendCodeError } from './FirebaseAuthService.js';
import { createAuthService } from './AuthService.js';
import { MockAuthService } from './MockAuthService.js';
import { firebaseConfigFrom, resolveConfig } from '../config.js';

const CONFIG = { apiKey: 'key', authDomain: 'demo.firebaseapp.com', projectId: 'demo', appId: '1:2:web:3' };

// Nachgebautes Firebase-SDK: zeichnet auf, was die App aufruft (keine Netzwerkanfrage).
function fakeFirebase({ sendError = null, confirmError = null } = {}) {
  const calls = { sent: [], verifiers: [], cleared: 0, deleted: [], signedOut: 0, language: null, apps: 0 };
  const client = {};
  const sdk = {
    getAuth: () => client,
    RecaptchaVerifier: class {
      constructor(auth, container, params) {
        calls.verifiers.push({ container, size: params.size });
      }
      clear() {
        calls.cleared += 1;
      }
    },
    async signInWithPhoneNumber(auth, phone) {
      calls.language = auth.languageCode;
      calls.sent.push(phone);
      if (sendError) throw Object.assign(new Error('send'), { code: sendError });
      return {
        async confirm(code) {
          if (confirmError) throw Object.assign(new Error('confirm'), { code: confirmError });
          if (code !== '123456') throw Object.assign(new Error('wrong'), { code: 'auth/invalid-verification-code' });
          return { user: { uid: 'u1' } };
        },
      };
    },
    async deleteUser(user) {
      calls.deleted.push(user.uid);
    },
    async signOut() {
      calls.signedOut += 1;
    },
  };
  const app = {
    getApps: () => [],
    initializeApp: (config) => {
      calls.apps += 1;
      calls.config = config;
      return {};
    },
  };
  return { calls, load: async () => ({ app, auth: sdk }) };
}

const service = (fake, now = () => 1_000) => new FirebaseAuthService({ config: CONFIG, load: fake.load, now, resendDelayMs: 30_000 });

test('Echte SMS: Firebase schickt den Code an die Nummer, mit reCAPTCHA und auf Deutsch', async () => {
  const fake = fakeFirebase();
  const auth = service(fake);
  const request = await auth.sendCode('+41791234567');
  assert.deepEqual(fake.calls.sent, ['+41791234567']);
  assert.equal(fake.calls.language, 'de');
  assert.deepEqual(fake.calls.verifiers, [{ container: 'recaptcha-container', size: 'invisible' }]);
  assert.deepEqual(fake.calls.config, CONFIG);
  assert.equal(request.resendAvailableAt - request.sentAt, 30_000, '„Code erneut senden“ nach 30 s');
  // Code erneut senden: frisches reCAPTCHA, Firebase nur einmal gestartet
  await auth.sendCode('+41791234567');
  assert.equal(fake.calls.verifiers.length, 2);
  assert.equal(fake.calls.cleared, 1);
  assert.equal(fake.calls.apps, 1);
});

test('Richtiger Code: bestätigt, danach Konto bei Firebase gelöscht und abgemeldet', async () => {
  const fake = fakeFirebase();
  const auth = service(fake);
  const { requestId } = await auth.sendCode('+41791234567');
  assert.deepEqual(await auth.verifyCode(requestId, '000000'), { ok: false, reason: 'wrong' });
  assert.deepEqual(fake.calls.deleted, []);
  assert.deepEqual(await auth.verifyCode(requestId, '123456'), { ok: true });
  assert.deepEqual(fake.calls.deleted, ['u1'], 'kein Konto bei Google behalten');
  assert.equal(fake.calls.signedOut, 1);
  assert.deepEqual(await auth.verifyCode(requestId, '123456'), { ok: false, reason: 'unknown' }, 'nur einmal gültig');
});

test('Fehler werden zu verständlichen Gründen', async () => {
  for (const [code, reason] of [
    ['auth/invalid-phone-number', 'invalidNumber'],
    ['auth/too-many-requests', 'tooMany'],
    ['auth/network-request-failed', 'network'],
    ['auth/quota-exceeded', 'unavailable'],
    ['auth/billing-not-enabled', 'unavailable'],
    ['auth/irgendwas', 'unknown'],
  ]) {
    const auth = service(fakeFirebase({ sendError: code }));
    await assert.rejects(auth.sendCode('+41791234567'), (error) => error instanceof SendCodeError && error.reason === reason, code);
  }
  for (const [code, reason] of [
    ['auth/code-expired', 'expired'],
    ['auth/too-many-requests', 'tooMany'],
    ['auth/network-request-failed', 'network'],
    ['auth/internal-error', 'failed'],
  ]) {
    const auth = service(fakeFirebase({ confirmError: code }));
    const { requestId } = await auth.sendCode('+41791234567');
    assert.deepEqual(await auth.verifyCode(requestId, '123456'), { ok: false, reason }, code);
  }
  // Firebase lädt nicht (offline): Netzwerkfehler, beim nächsten Versuch neu laden
  let attempts = 0;
  const offline = new FirebaseAuthService({ config: CONFIG, load: async () => { attempts += 1; throw new Error('offline'); } });
  await assert.rejects(offline.sendCode('+41791234567'), (error) => error.reason === 'network');
  await assert.rejects(offline.sendCode('+41791234567'), (error) => error.reason === 'network');
  assert.equal(attempts, 2);
});

test('Ohne Firebase-Einrichtung bleibt die Simulation; ?sms=sim erzwingt sie', () => {
  assert.equal(firebaseConfigFrom({}), null);
  assert.equal(firebaseConfigFrom({ VITE_FIREBASE_API_KEY: 'key' }), null, 'unvollständig zählt nicht');
  assert.deepEqual(
    firebaseConfigFrom({ VITE_FIREBASE_API_KEY: 'key', VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com', VITE_FIREBASE_PROJECT_ID: 'demo', VITE_FIREBASE_APP_ID: '1:2:web:3' }),
    CONFIG
  );
  assert.ok(createAuthService() instanceof MockAuthService);
  assert.ok(createAuthService({ mode: 'firebase', firebaseConfig: null }) instanceof MockAuthService, 'ohne Werte keine echte SMS');
  assert.ok(createAuthService({ mode: 'firebase', firebaseConfig: CONFIG }) instanceof FirebaseAuthService);
  assert.equal(resolveConfig('?sms=sim').sms, 'simulation');
  assert.equal(createAuthService({ mode: 'firebase', firebaseConfig: CONFIG }).onSimulatedSms, undefined, 'keine Mitteilung auf der Seite bei echter SMS');
});
