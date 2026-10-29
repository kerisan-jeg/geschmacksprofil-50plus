import { useEffect, useRef, useState } from 'react';
import { CircleAlert, Lock } from 'lucide-react';
import ChoiceList from '../components/ChoiceList.jsx';
import TopBar, { BackButton } from '../components/TopBar.jsx';
import { ABOUT } from '../labels.js';

// „Über dich“: erster Schritt im Onboarding. Alter und Einwilligung sind Pflicht (Rückmeldung Team, 12.10.).
// Mit Anmeldung kennen wir den Vornamen schon. Ohne Anmeldung (AUTH_ENABLED = false) ist er hier freiwillig.
// Die Einwilligung steht als kleine Schrift mit Kästchen unter den Altersfeldern (Teamentscheid 28.10.2026),
// bleibt aber Pflicht. Die Altersgruppe geht in die Auswertung.
export default function AboutScreen({ person, askName, firstName: initialName = '', onSubmit, onBack }) {
  const [firstName, setFirstName] = useState(initialName);
  const [ageGroup, setAgeGroup] = useState(person.ageGroup);
  const [consent, setConsent] = useState(person.consent);
  const [showError, setShowError] = useState(false);
  const ageRef = useRef(null);
  const consentRef = useRef(null);

  const missing = { age: ageGroup == null, consent: !consent };

  // Beim ersten fehlenden Feld anfangen: dorthin scrollen.
  useEffect(() => {
    if (!showError) return;
    (missing.age ? ageRef : consentRef).current?.scrollIntoView({ block: 'center' });
    // Nur beim Absenden auslösen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showError]);

  function handleSubmit(event) {
    event.preventDefault();
    if (missing.age || missing.consent) {
      setShowError(false);
      requestAnimationFrame(() => setShowError(true));
      return;
    }
    onSubmit({
      person: { ...person, ageGroup, consent: true },
      firstName: askName ? firstName.trim().slice(0, 30) : null,
    });
  }

  return (
    <main className="screen screen-about">
      {onBack && <TopBar start={<BackButton onClick={onBack} />} />}

      <div className="stack">
        <h1>{ABOUT.title}</h1>
      </div>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {askName && (
          <div className="field">
            <label htmlFor="about-name">
              {ABOUT.firstName}
              <span className="optional">{ABOUT.optional}</span>
            </label>
            <input
              id="about-name"
              className="input"
              type="text"
              autoComplete="given-name"
              autoCapitalize="words"
              enterKeyHint="next"
              maxLength={30}
              aria-describedby="about-name-hint"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
            <p className="field-hint" id="about-name-hint">
              {ABOUT.firstNameHint}
            </p>
          </div>
        )}

        <fieldset className="field-set" ref={ageRef}>
          <legend id="age-label">{ABOUT.age}</legend>
          <ChoiceList name="age" layout="grid" options={ABOUT.ageGroups} value={ageGroup} onChange={setAgeGroup} labelledBy="age-label" />
          {showError && missing.age && (
            <p className="form-error" role="alert">
              <CircleAlert aria-hidden="true" />
              {ABOUT.errorAge}
            </p>
          )}
        </fieldset>

        <div className="field" ref={consentRef}>
          <label className="consent-line">
            <input type="checkbox" name="consent" checked={consent} onChange={() => setConsent(!consent)} />
            <span className="note">{ABOUT.consent}</span>
          </label>
          {showError && missing.consent && (
            <p className="form-error" role="alert">
              <CircleAlert aria-hidden="true" />
              {ABOUT.errorConsent}
            </p>
          )}
        </div>

        <div className="action-bar">
          <button type="submit" className="button-primary">
            {ABOUT.submit}
          </button>
          <p className="privacy-line">
            <Lock aria-hidden="true" />
            {ABOUT.privacy}
          </p>
        </div>
      </form>
    </main>
  );
}
