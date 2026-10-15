// ECHTE SMS über Firebase Authentication (Anmeldung mit Telefonnummer), Entscheid vom 15.10.2026.
//
// Erfüllt dieselbe Schnittstelle wie MockAuthService (siehe AuthService.js); die Oberfläche bleibt gleich.
// - Firebase schickt den Code per SMS an die Nummer. Dafür geht die Nummer an Google (USA).
// - Ein unsichtbares reCAPTCHA schützt vor Missbrauch (Pflicht bei Firebase). Es hängt am Element
//   #recaptcha-container, das App.jsx immer rendert.
// - Nach der Bestätigung wird das Konto bei Firebase sofort wieder gelöscht und abgemeldet: Die App
//   braucht kein Konto bei Google. Auf dem Gerät bleibt nur die gekürzte Nummer (storage/local.js).
// - Das SDK wird erst geladen, wenn wirklich ein Code verschickt wird (dynamischer Import): Wer die
//   Simulation nutzt, lädt nichts von Google.
// Einrichtung (Firebase-Projekt, Variablen VITE_FIREBASE_*): siehe README, „Registrierung“.

export const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

// Fehler beim Versand mit einem Grund für eine verständliche Meldung (labels.js, REGISTER.sendErrors).
export class SendCodeError extends Error {
  constructor(reason, cause) {
    super(`SMS konnte nicht gesendet werden: ${reason}`);
    this.reason = reason;
    this.cause = cause;
  }
}

const SEND_REASONS = {
  'auth/invalid-phone-number': 'invalidNumber',
  'auth/missing-phone-number': 'invalidNumber',
  'auth/too-many-requests': 'tooMany',
  'auth/network-request-failed': 'network',
  'auth/captcha-check-failed': 'retry',
  'auth/quota-exceeded': 'unavailable',
  'auth/operation-not-allowed': 'unavailable',
  'auth/billing-not-enabled': 'unavailable',
};

const VERIFY_REASONS = {
  'auth/invalid-verification-code': 'wrong',
  'auth/missing-verification-code': 'wrong',
  'auth/code-expired': 'expired',
  'auth/too-many-requests': 'tooMany',
  'auth/network-request-failed': 'network',
};

async function loadFirebase() {
  const [app, auth] = await Promise.all([import('@firebase/app'), import('@firebase/auth')]);
  return { app, auth };
}

export class FirebaseAuthService {
  constructor({ config, resendDelayMs = 30_000, now = () => Date.now(), load = loadFirebase, container = RECAPTCHA_CONTAINER_ID }) {
    this.config = config;
    this.resendDelayMs = resendDelayMs;
    this.now = now;
    this.load = load;
    this.container = container;
    this.requests = new Map();
    this.counter = 0;
    this.ready = null;
    this.verifier = null;
  }

  // Firebase einmal starten, Sprache Deutsch (Text der SMS und des reCAPTCHA).
  async firebase() {
    if (!this.ready) {
      this.ready = this.load().then(({ app, auth }) => {
        const instance = app.getApps().find((entry) => entry.name === 'geschmacksprofil') ?? app.initializeApp(this.config, 'geschmacksprofil');
        const client = auth.getAuth(instance);
        client.languageCode = 'de';
        return { client, sdk: auth };
      });
      // Ein fehlgeschlagener Start (z. B. offline) soll beim nächsten Versuch neu laden.
      this.ready.catch(() => {
        this.ready = null;
      });
    }
    return this.ready;
  }

  async sendCode(e164) {
    if (!e164) throw new SendCodeError('invalidNumber');
    let firebase;
    try {
      firebase = await this.firebase();
    } catch (error) {
      throw new SendCodeError('network', error);
    }
    const { client, sdk } = firebase;
    // Jeder Versand (auch „Code erneut senden“) braucht ein frisches reCAPTCHA.
    this.verifier?.clear?.();
    this.verifier = new sdk.RecaptchaVerifier(client, this.container, { size: 'invisible' });
    try {
      const confirmation = await sdk.signInWithPhoneNumber(client, e164, this.verifier);
      this.counter += 1;
      const requestId = `sms-${this.counter}`;
      const sentAt = this.now();
      this.requests.set(requestId, confirmation);
      return { requestId, sentAt, resendAvailableAt: sentAt + this.resendDelayMs };
    } catch (error) {
      this.verifier?.clear?.();
      this.verifier = null;
      throw new SendCodeError(SEND_REASONS[error?.code] ?? 'unknown', error);
    }
  }

  async verifyCode(requestId, code) {
    const confirmation = this.requests.get(requestId);
    if (!confirmation) return { ok: false, reason: 'unknown' };
    let credential;
    try {
      credential = await confirmation.confirm(String(code));
    } catch (error) {
      return { ok: false, reason: VERIFY_REASONS[error?.code] ?? 'failed' };
    }
    this.requests.delete(requestId);
    // Kein Konto bei Google behalten: sofort löschen und abmelden. Scheitert das (z. B. offline),
    // ist die Bestätigung trotzdem gültig; das Konto lässt sich in der Firebase-Konsole löschen.
    const { client, sdk } = await this.firebase();
    try {
      await sdk.deleteUser(credential.user);
    } catch {
      // bewusst ignoriert, siehe oben
    }
    try {
      await sdk.signOut(client);
    } catch {
      // bewusst ignoriert
    }
    return { ok: true };
  }
}
