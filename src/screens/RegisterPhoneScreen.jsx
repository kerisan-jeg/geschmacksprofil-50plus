import { useEffect, useRef, useState } from 'react';
import { CircleAlert, Lock } from 'lucide-react';
import TopBar, { BackButton } from '../components/TopBar.jsx';
import { COUNTRIES, countryById, formatPhoneInput, validatePhone } from '../auth/phone.js';
import { REGISTER } from '../labels.js';

// Registrierung, Schritt 2: Handynummer mit Ländervorwahl (Standard +41).
// Die Nummer wird beim Tippen gegliedert („079 123 45 67“) und erst beim Senden geprüft.
// Sie bleibt nur im Arbeitsspeicher; gespeichert wird nach der Bestätigung nur die gekürzte Form.
export default function RegisterPhoneScreen({ country, phoneInput, onChange, onSend, onBack }) {
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const current = countryById(country);

  useEffect(() => {
    if (error) inputRef.current?.focus();
  }, [error]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending) return;
    const result = validatePhone(phoneInput, current);
    if (!result.ok) {
      setError(REGISTER.phoneErrors[result.error]);
      return;
    }
    setError(null);
    setSending(true);
    try {
      await onSend(result.e164);
    } catch {
      setError(REGISTER.sendError);
      setSending(false);
    }
  }

  return (
    <main className="screen screen-register">
      <TopBar start={<BackButton onClick={onBack} />} end={<p className="progress-text num">{REGISTER.stepOf(2, 3)}</p>} />
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="stack">
          <h1>{REGISTER.phoneTitle}</h1>
          <p className="lead">{REGISTER.phoneLead}</p>
        </div>
        <div className="field">
          <label htmlFor="register-phone">{REGISTER.phoneLabel}</label>
          <div className="phone-row">
            <select
              className="input phone-country"
              aria-label={REGISTER.countryLabel}
              value={current.id}
              onChange={(event) => {
                const next = countryById(event.target.value);
                onChange({ country: next.id, phoneInput: formatPhoneInput(phoneInput, next) });
                setError(null);
              }}
            >
              {COUNTRIES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {REGISTER.countryOption(REGISTER.countries[entry.id], entry.dial)}
                </option>
              ))}
            </select>
            <input
              id="register-phone"
              ref={inputRef}
              className={`input phone-number num${error ? ' is-invalid' : ''}`}
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              enterKeyHint="send"
              placeholder={REGISTER.phonePlaceholder}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'register-phone-error' : 'register-phone-privacy'}
              value={phoneInput}
              onChange={(event) => {
                onChange({ phoneInput: formatPhoneInput(event.target.value, current) });
                setError(null);
              }}
            />
          </div>
          {error && (
            <p className="form-error" id="register-phone-error" role="alert">
              <CircleAlert aria-hidden="true" />
              {error}
            </p>
          )}
        </div>
        <p className="privacy-line privacy-left" id="register-phone-privacy">
          <Lock aria-hidden="true" />
          {REGISTER.phonePrivacy}
        </p>
        <div className="action-bar">
          <button type="submit" className="button-primary" disabled={sending} aria-busy={sending}>
            {sending && <span className="spinner" aria-hidden="true" />}
            {sending ? REGISTER.sending : REGISTER.sendCode}
          </button>
        </div>
      </form>
    </main>
  );
}
