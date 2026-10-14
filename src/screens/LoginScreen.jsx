import { useEffect, useRef, useState } from 'react';
import { CircleAlert, Lock } from 'lucide-react';
import ChoiceList from '../components/ChoiceList.jsx';
import TopBar, { BackButton } from '../components/TopBar.jsx';
import { LOGIN } from '../labels.js';

// Anmeldung ohne Passwort: Für den Test zählt der Aufwand beim Profil, nicht beim Einloggen.
// Vorname und Alter sind Pflicht (Rückmeldung Team, 12.10.). Der Vorname dient nur der
// persönlichen Ansprache und wird weiterhin nicht protokolliert; die Altersgruppe schon.
export default function LoginScreen({ person, onSubmit, onBack }) {
  const [firstName, setFirstName] = useState(person.firstName);
  const [ageGroup, setAgeGroup] = useState(person.ageGroup);
  const [consent, setConsent] = useState(person.consent);
  const [participantCode, setParticipantCode] = useState(person.participantCode);
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

  return (
    <main className="screen screen-login">
      <TopBar start={<BackButton onClick={onBack} />} />

      <div className="stack">
        <h1>{LOGIN.title}</h1>
        <p className="lead">{LOGIN.lead}</p>
      </div>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="first-name">{LOGIN.firstName}</label>
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
              {LOGIN.errorName}
            </p>
          )}
        </div>

        <fieldset className="field-set" ref={ageRef}>
          <legend id="age-label">{LOGIN.age}</legend>
          <ChoiceList name="age" layout="grid" options={LOGIN.ageGroups} value={ageGroup} onChange={setAgeGroup} labelledBy="age-label" />
          {showError && missing.age && (
            <p className="form-error" role="alert">
              <CircleAlert aria-hidden="true" />
              {LOGIN.errorAge}
            </p>
          )}
        </fieldset>

        <div className="field" ref={consentRef}>
          <ChoiceList name="consent" multiple options={[{ id: 'consent', label: LOGIN.consent }]} value={consent ? ['consent'] : []} onChange={() => setConsent(!consent)} />
          {showError && missing.consent && (
            <p className="form-error" role="alert">
              <CircleAlert aria-hidden="true" />
              {LOGIN.errorConsent}
            </p>
          )}
        </div>

        <details className="lead-details">
          <summary>{LOGIN.leadDetails}</summary>
          <div className="field">
            <label htmlFor="participant-code">{LOGIN.participantCode}</label>
            <input
              id="participant-code"
              className="input"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder={LOGIN.participantPlaceholder}
              maxLength={20}
              value={participantCode}
              onChange={(event) => setParticipantCode(event.target.value)}
            />
          </div>
        </details>

        <div className="action-bar">
          <button type="submit" className="button-primary">
            {LOGIN.submit}
          </button>
          <p className="privacy-line">
            <Lock aria-hidden="true" />
            {LOGIN.privacy}
          </p>
        </div>
      </form>
    </main>
  );
}
