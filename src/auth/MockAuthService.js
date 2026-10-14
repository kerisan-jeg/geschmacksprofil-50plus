// SIMULATION – es wird KEINE SMS verschickt.
//
// MockAuthService erfüllt die Schnittstelle AuthService (siehe AuthService.js) nur im Browser:
// Er erzeugt einen zufälligen Code, merkt ihn sich im Arbeitsspeicher und meldet ihn über
// onSimulatedSms() an die Oberfläche. Diese zeigt ihn als SMS-Mitteilung oben am Bildschirm,
// wie eine echte Push-Benachrichtigung. Die Telefonnummer verlässt das Gerät nie und wird hier
// nicht gespeichert. Für einen echten Dienst wird nur createAuthService() ausgetauscht.

function randomDigits(length, random) {
  let code = '';
  for (let i = 0; i < length; i += 1) code += String(Math.floor(random() * 10) % 10);
  return code;
}

// Zufall aus crypto, wenn vorhanden (Tests können eine eigene Quelle übergeben).
function defaultRandom() {
  try {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] / 2 ** 32;
  } catch {
    return Math.random();
  }
}

export class MockAuthService {
  constructor({ codeLength = 6, resendDelayMs = 30_000, latencyMs = 700, validForMs = 10 * 60_000, now = () => Date.now(), random = defaultRandom, wait } = {}) {
    this.codeLength = codeLength;
    this.resendDelayMs = resendDelayMs;
    this.latencyMs = latencyMs;
    this.validForMs = validForMs;
    this.now = now;
    this.random = random;
    // Simulierte Netzwerkzeit, damit der Ladezustand („Code wird gesendet …“) sichtbar wird.
    this.wait = wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.requests = new Map();
    this.listeners = new Set();
    this.counter = 0;
  }

  async sendCode(e164) {
    if (!e164) throw new Error('Handynummer fehlt');
    await this.wait(this.latencyMs);
    const code = randomDigits(this.codeLength, this.random);
    this.counter += 1;
    const requestId = `sim-${this.counter}`;
    const sentAt = this.now();
    // Nur der Code und der Zeitpunkt werden gemerkt, nicht die Nummer.
    this.requests.set(requestId, { code, sentAt });
    for (const listener of this.listeners) listener({ code, sentAt });
    return { requestId, sentAt, resendAvailableAt: sentAt + this.resendDelayMs };
  }

  async verifyCode(requestId, code) {
    await this.wait(this.latencyMs / 2);
    const request = this.requests.get(requestId);
    if (!request) return { ok: false, reason: 'unknown' };
    if (this.now() - request.sentAt > this.validForMs) return { ok: false, reason: 'expired' };
    if (String(code) !== request.code) return { ok: false, reason: 'wrong' };
    this.requests.delete(requestId);
    return { ok: true };
  }

  // Nur in der Simulation: die „empfangene“ SMS für die Mitteilung oben am Bildschirm.
  onSimulatedSms(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
