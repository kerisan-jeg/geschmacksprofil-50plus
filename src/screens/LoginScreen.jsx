import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, CircleAlert, Lock } from 'lucide-react';
import ChoiceList from '../components/ChoiceList.jsx';

// Anmeldung ohne Passwort: Für den Test zählt der Aufwand beim Profil, nicht beim Einloggen.
// Der Vorname dient nur der persönlichen Ansprache und wird nicht protokolliert.
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
  const consentRef = useRef(null);

  useEffect(() => {
    if (showError) consentRef.current?.scrollIntoView({ block: 'center' });
  }, [showError]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!consent) {
      setShowError(true);
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
    setShowError(false);
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
          <label htmlFor="first-name">
            Vorname <span className="optional">freiwillig</span>
          </label>
          <input
            id="first-name"
            className="input"
            type="text"
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={30}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </div>

        <fieldset className="field field-set">
          <legend id="age-label">
            Alter <span className="optional">freiwillig</span>
          </legend>
          <ChoiceList name="age" layout="grid" options={AGE_GROUPS} value={ageGroup} onChange={setAgeGroup} labelledBy="age-label" />
        </fieldset>

        <div className="field" ref={consentRef}>
          <ChoiceList name="consent" multiple options={CONSENT} value={consent ? ['consent'] : []} onChange={toggleConsent} />
          {showError && !consent && (
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
