import { useEffect, useRef, useState } from 'react';
import { CircleAlert, Info, RotateCw } from 'lucide-react';
import TopBar, { BackButton } from '../components/TopBar.jsx';
import { CODE_LENGTH, cleanCode, resendSecondsLeft } from '../auth/AuthService.js';
import { REGISTER } from '../labels.js';

// Registrierung, Schritt 3: SMS-Code mit 6 Ziffern in einem einzigen Feld.
// - autocomplete="one-time-code": Handys schlagen den Code aus einer echten SMS vor
// - Einfügen aus der Zwischenablage funktioniert (Leerzeichen und Striche werden entfernt)
// - mit der 6. Ziffer wird automatisch geprüft und bei Erfolg weitergeleitet
// - „Code erneut senden“ erst nach 30 Sekunden (Countdown mit tabellarischen Ziffern)
export default function RegisterCodeScreen({ phoneDisplay, request, onVerify, onResend, onBack, clock = Date.now }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState(null);
  const [now, setNow] = useState(() => clock());
  const inputRef = useRef(null);
  const secondsLeft = resendSecondsLeft(request.resendAvailableAt, now);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Countdown: einmal pro Sekunde neu rechnen, bis „Code erneut senden“ möglich ist.
  useEffect(() => {
    if (resendSecondsLeft(request.resendAvailableAt, clock()) === 0) return undefined;
    const timer = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(timer);
  }, [request.resendAvailableAt, clock]);

  async function verify(value) {
    setStatus('checking');
    setMessage(null);
    const result = await onVerify(value);
    if (result.ok) return;
    setStatus('error');
    setMessage(result.reason === 'expired' ? REGISTER.codeExpired : REGISTER.codeWrong);
    // Ganze Eingabe markieren: Neu tippen ersetzt den falschen Code.
    window.requestAnimationFrame?.(() => inputRef.current?.select());
  }

  function handleChange(raw) {
    const value = cleanCode(raw);
    setCode(value);
    if (status === 'error') setStatus('idle');
    if (value.length === CODE_LENGTH && status !== 'checking') verify(value);
  }

  async function handleResend() {
    if (secondsLeft > 0) return;
    setCode('');
    setStatus('idle');
    await onResend();
    setNow(clock());
    setMessage(REGISTER.resent);
    inputRef.current?.focus({ preventScroll: true });
  }

  const error = status === 'error';

  return (
    <main className="screen screen-register">
      <TopBar start={<BackButton onClick={onBack} label={REGISTER.changeNumber} />} end={<p className="progress-text num">{REGISTER.stepOf(3, 3)}</p>} />
      <form
        className="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (code.length === CODE_LENGTH && status !== 'checking') verify(code);
        }}
      >
        <div className="stack">
          <h1>{REGISTER.codeTitle}</h1>
          <p className="lead">{REGISTER.codeLead(phoneDisplay)}</p>
        </div>
        <div className="field">
          <label htmlFor="register-code">{REGISTER.codeLabel}</label>
          <input
            id="register-code"
            ref={inputRef}
            className={`input code-input num${error ? ' is-invalid' : ''}`}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={CODE_LENGTH + 6}
            enterKeyHint="done"
            aria-invalid={error}
            aria-describedby="register-code-hint register-code-status"
            value={code}
            readOnly={status === 'checking'}
            onChange={(event) => handleChange(event.target.value)}
          />
          <p className="field-hint" id="register-code-hint">
            {REGISTER.codeHint}
          </p>
          <div id="register-code-status" aria-live="polite">
            {status === 'checking' && (
              <p className="status-line">
                <span className="spinner spinner-dark" aria-hidden="true" />
                {REGISTER.checking}
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                <CircleAlert aria-hidden="true" />
                {message}
              </p>
            )}
            {!error && status !== 'checking' && message && <p className="note">{message}</p>}
          </div>
        </div>

        <button type="button" className="button-secondary resend-button" disabled={secondsLeft > 0} onClick={handleResend}>
          <RotateCw aria-hidden="true" />
          <span className="num">{secondsLeft > 0 ? REGISTER.resendIn(secondsLeft) : REGISTER.resend}</span>
        </button>

        <p className="notice">
          <Info aria-hidden="true" />
          {REGISTER.simulationNote}
        </p>

        <div className="action-bar">
          <button type="submit" className="button-primary" disabled={code.length < CODE_LENGTH || status === 'checking'}>
            {REGISTER.confirmCode}
          </button>
        </div>
      </form>
    </main>
  );
}
