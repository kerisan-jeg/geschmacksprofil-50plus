import { useEffect, useRef, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import TopBar, { BackButton } from '../components/TopBar.jsx';
import { REGISTER } from '../labels.js';

// Anmeldung: nur der Vorname (kein Nachname, keine Handynummer; Teamentscheid 28.10.2026). Der Vorname geht ins
// Konto auf dem Gerät und als participantName in die Sitzung, damit die Testleitung die Antworten zuordnen kann.
export default function RegisterNameScreen({ firstName, onChange, onNext, onBack }) {
  const [showError, setShowError] = useState(false);
  const inputRef = useRef(null);
  const missing = firstName.trim() === '';

  useEffect(() => {
    if (showError) inputRef.current?.focus();
  }, [showError]);

  function handleSubmit(event) {
    event.preventDefault();
    if (missing) {
      setShowError(true);
      return;
    }
    onNext(firstName.trim().slice(0, 30));
  }

  return (
    <main className="screen screen-register">
      <TopBar start={<BackButton onClick={onBack} />} />
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="stack">
          <h1>{REGISTER.nameTitle}</h1>
          <p className="lead">{REGISTER.nameLead}</p>
        </div>
        <div className="field">
          <label htmlFor="register-name">{REGISTER.nameLabel}</label>
          <input
            id="register-name"
            ref={inputRef}
            className={`input${showError && missing ? ' is-invalid' : ''}`}
            type="text"
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={30}
            required
            aria-invalid={showError && missing}
            aria-describedby={showError && missing ? 'register-name-error' : undefined}
            value={firstName}
            onChange={(event) => {
              onChange(event.target.value);
              setShowError(false);
            }}
          />
          {showError && missing && (
            <p className="form-error" id="register-name-error" role="alert">
              <CircleAlert aria-hidden="true" />
              {REGISTER.nameError}
            </p>
          )}
          <p className="field-hint">{REGISTER.namePrivacy}</p>
        </div>
        <div className="action-bar">
          <button type="submit" className="button-primary">
            {REGISTER.nameNext}
          </button>
        </div>
      </form>
    </main>
  );
}
