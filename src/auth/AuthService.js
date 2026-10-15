// Schnittstelle für die Anmeldung per SMS-Code.
//
// Zwei Umsetzungen mit denselben Methoden, gewählt in createAuthService():
// - FirebaseAuthService: echte SMS über Firebase (wenn eingerichtet, config.sms === 'firebase')
// - MockAuthService: SIMULATION ohne SMS-Versand (ohne Firebase, in Tests oder mit ?sms=sim)
// Die Oberfläche bleibt in beiden Fällen gleich.
//
// @typedef {Object} CodeRequest
// @property {string} requestId          Kennung der Anfrage
// @property {number} sentAt             Zeitpunkt des Versands (ms)
// @property {number} resendAvailableAt  ab wann „Code erneut senden“ möglich ist (ms)
//
// @typedef {Object} VerifyResult
// @property {boolean} ok
// @property {'wrong'|'expired'|'tooMany'|'network'|'failed'|'unknown'} [reason]
//
// @typedef {Object} AuthService
// @property {(e164: string) => Promise<CodeRequest>} sendCode    Code an die Handynummer senden
// @property {(requestId: string, code: string) => Promise<VerifyResult>} verifyCode
// @property {(listener: (sms: {code: string, sentAt: number}) => void) => () => void} [onSimulatedSms]
//           nur in der Simulation: meldet die „empfangene“ SMS, damit sie als Mitteilung erscheint

import { FIREBASE_CONFIG } from '../config.js';
import { FirebaseAuthService } from './FirebaseAuthService.js';
import { MockAuthService } from './MockAuthService.js';

export const CODE_LENGTH = 6;
export const RESEND_DELAY_MS = 30_000;

// Verbleibende ganze Sekunden bis „Code erneut senden“ (0 = jetzt möglich).
export function resendSecondsLeft(resendAvailableAt, now) {
  return Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
}

// Nur Ziffern, höchstens CODE_LENGTH: Einfügen aus der Zwischenablage („123 456“) funktioniert.
export function cleanCode(raw) {
  return String(raw ?? '').replace(/\D/g, '').slice(0, CODE_LENGTH);
}

/** @returns {AuthService} */
export function createAuthService({ mode = 'simulation', firebaseConfig = FIREBASE_CONFIG, ...options } = {}) {
  if (mode === 'firebase' && firebaseConfig) return new FirebaseAuthService({ config: firebaseConfig, resendDelayMs: RESEND_DELAY_MS, ...options });
  return new MockAuthService({ codeLength: CODE_LENGTH, resendDelayMs: RESEND_DELAY_MS, ...options });
}
