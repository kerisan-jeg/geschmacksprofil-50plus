import { useEffect, useRef, useState } from 'react';
import { CircleAlert, Send } from 'lucide-react';
import ChoiceList from '../components/ChoiceList.jsx';
import TopBar, { BackButton } from '../components/TopBar.jsx';
import { SURVEY } from '../labels.js';

// Kurze Befragung zum Schluss (Vorschlag 29.10.2026): vier Fragen mit Auswahl (Pflicht) und eine offene Frage
// (freiwillig). Die Antworten gehen als survey in die Sitzung; die Teilnahmenummer der Sitzung verbindet sie mit den
// Antworten zu den Karten.
export default function SurveyScreen({ firstName, onSubmit, onBack }) {
  const [values, setValues] = useState(() => Object.fromEntries(SURVEY.scales.map((scale) => [scale.id, null])));
  const [remarks, setRemarks] = useState('');
  const [showError, setShowError] = useState(false);
  const refs = useRef({});
  const missing = SURVEY.scales.filter((scale) => values[scale.id] == null).map((scale) => scale.id);

  // Zur ersten fehlenden Antwort scrollen.
  useEffect(() => {
    if (!showError || missing.length === 0) return;
    refs.current[missing[0]]?.scrollIntoView?.({ block: 'center' });
    // Nur beim Absenden auslösen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showError]);

  function handleSubmit(event) {
    event.preventDefault();
    if (missing.length > 0) {
      setShowError(false);
      requestAnimationFrame(() => setShowError(true));
      return;
    }
    onSubmit({ ...values, remarks: remarks.trim().slice(0, 500) });
  }

  return (
    <main className="screen screen-survey">
      <TopBar start={<BackButton onClick={onBack} />} />

      <div className="stack">
        <p className="kicker">{SURVEY.kicker}</p>
        <h1>{SURVEY.title(firstName)}</h1>
        <p className="lead">{SURVEY.lead}</p>
      </div>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {SURVEY.scales.map((scale) => (
          <fieldset
            key={scale.id}
            className="field-set"
            ref={(node) => {
              refs.current[scale.id] = node;
            }}
          >
            <legend id={`survey-${scale.id}`}>{scale.question}</legend>
            <ChoiceList
              name={`survey-${scale.id}`}
              options={scale.options}
              value={values[scale.id]}
              onChange={(value) => setValues((previous) => ({ ...previous, [scale.id]: value }))}
              labelledBy={`survey-${scale.id}`}
            />
            {showError && values[scale.id] == null && (
              <p className="form-error" role="alert">
                <CircleAlert aria-hidden="true" />
                {SURVEY.errorMissing}
              </p>
            )}
          </fieldset>
        ))}

        <div className="field">
          <label htmlFor="survey-remarks">
            {SURVEY.remarks}
            <span className="optional">{SURVEY.optional}</span>
          </label>
          <textarea
            id="survey-remarks"
            className="input textarea"
            rows={4}
            maxLength={500}
            placeholder={SURVEY.remarksPlaceholder}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
          />
        </div>

        <div className="action-bar">
          <button type="submit" className="button-primary">
            <Send aria-hidden="true" />
            {SURVEY.submit}
          </button>
          <p className="fineprint">{SURVEY.fineprint}</p>
        </div>
      </form>
    </main>
  );
}
