import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, CircleAlert, Lock } from 'lucide-react';
import ChoiceList from '../components/ChoiceList.jsx';

// Anmeldung ohne Passwort: Für den Test zählt der Aufwand beim Profil, nicht beim Einloggen.
// Vorname und Alter sind Pflicht (Rückmeldung Team, 12.10.). Der Vorname dient nur der
// persönlichen Ansprache und wird weiterhin nicht protokolliert; die Altersgruppe schon.
const AGE_GROUPS = [
  { id: '50-59', label: '50 bis 59' },
  { id: '60-69', label: '60 bis 69' },
  { id: '70-79', label: '70 bis 79' },
  { id: '80+', label: '80 und älter' },
];

const CONSENT = [
  {
    id: 'consent',
    label: 'Ich bin einverstanden, dass meine Antworten ohne Namen für dieses Studierendenprojekt ausgewertet werden.',
  },
];

export default function LoginScreen({ profile, onSubmit, onBack }) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [ageGroup, setAgeGroup] = useState(profile.ageGroup);
  const [consent, setConsent] = useState(profile.consent);
  const [participantCode, setParticipantCode] = useState(profile.participantCode);
  const [showError, setShowError] = useState(false);
  const nameRef = useRef(null);
  const ageRef = useRef(null);
  const consentRef = useRef(null);

  const missing = {
    name: firstName.trim() === '',
    age: ageGroup == null,
    consent: !consent,
  };

  // Beim ersten fehlenden Feld anfangen: dorthin scrollen, beim Namen auch den Fokus setzen.
  useEffect(() => {
    if (!showError) return;
    if (missing.name) nameRef.current?.focus();
    const target = missing.name ? nameRef : missing.age ? ageRef : consentRef;
    target.current?.scrollIntoView({ block: 'center' });
    // Nur beim Absenden auslösen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showError]);

  function handleSubmit(event) {
    event.preventDefault();
    if (missing.name || missing.age || missing.consent) {
      setShowError(false);
      requestAnimationFrame(() => setShowError(true));
      return;
    }
    onSubmit({
      firstName: firstName.trim().slice(0, 30),
      ageGroup,
      consent: true,
      participantCode: participantCode.trim().toUpperCase().slice(0, 20),
    });
  }

  function toggleConsent() {
    setConsent(!consent);
  }

  return (
    <main className="screen screen-login">
      <header className="screen-top">
        <button type="button" className="link-button" onClick={onBack}>
          <ChevronLeft aria-hidden="true" />
          Zurück
        </button>
      </header>

      <h1>Anmelden</h1>
      <p className="lead">Damit wir dich persönlich ansprechen können. Ein Passwort brauchst du nicht.</p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="first-name">Vorname</label>
          <input
            id="first-name"
            ref={nameRef}
            className={`input${showError && missing.name ? ' is-invalid' : ''}`}
            type="text"
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={30}
            required
            aria-invalid={showError && missing.name}
            aria-describedby={showError && missing.name ? 'name-error' : undefined}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
          {showError && missing.name && (
            <p className="form-error" id="name-error" role="alert">
              <CircleAlert aria-hidden="true" />
              Bitte gib deinen Vornamen ein.
            </p>
          )}
        </div>

        <fieldset className="field field-set" ref={ageRef}>
          <legend id="age-label">Alter</legend>
          <ChoiceList name="age" layout="grid" options={AGE_GROUPS} value={ageGroup} onChange={setAgeGroup} labelledBy="age-label" />
          {showError && missing.age && (
            <p className="form-error field-error" role="alert">
              <CircleAlert aria-hidden="true" />
              Bitte wähle deine Altersgruppe.
            </p>
          )}
        </fieldset>

        <div className="field" ref={consentRef}>
          <ChoiceList name="consent" multiple options={CONSENT} value={consent ? ['consent'] : []} onChange={toggleConsent} />
          {showError && missing.consent && (
            <p className="form-error" role="alert">
              <CircleAlert aria-hidden="true" />
              Bitte bestätige die Einwilligung, damit es weitergehen kann.
            </p>
          )}
        </div>

        <details className="lead-details">
          <summary>Für die Testleitung</summary>
          <div className="field">
            <label htmlFor="participant-code">Teilnehmer-Nr.</label>
            <input
              id="participant-code"
              className="input"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="z. B. T07"
              maxLength={20}
              value={participantCode}
              onChange={(event) => setParticipantCode(event.target.value)}
            />
          </div>
        </details>

        <div className="sticky-actions">
          <button type="submit" className="button-primary">Anmelden</button>
          <p className="privacy-line">
            <Lock aria-hidden="true" />
            Deine Angaben bleiben auf diesem Gerät.
          </p>
        </div>
      </form>
    </main>
  );
}
