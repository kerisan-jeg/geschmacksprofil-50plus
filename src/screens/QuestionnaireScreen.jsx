import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, CircleAlert, CircleHelp } from 'lucide-react';
import ChoiceList from '../components/ChoiceList.jsx';
import AllergenPicker from '../components/AllergenPicker.jsx';
import NeverPicker from '../components/NeverPicker.jsx';
import SegmentedProgress from '../components/SegmentedProgress.jsx';
import { isAnswered } from '../logic/stage0.js';
import { ONBOARDING } from '../labels.js';

// Stufe 0 als kurzer Fragebogen: eine Frage pro Bildschirm.
// Erst bei „Ja“ erscheint die Detailauswahl (nurec v0.2, Kap. 2: nur bei „vorhanden“ nachfragen).
export default function QuestionnaireScreen({ questions, step, answers, firstName, allergens, catalogIndex, onChange, onStep }) {
  const question = questions[step];
  const answer = answers[question.id];
  const last = step === questions.length - 1;
  const [showError, setShowError] = useState(false);
  const headingRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    setShowError(false);
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (showError) errorRef.current?.scrollIntoView({ block: 'center' });
  }, [showError]);

  function update(value) {
    onChange(question.id, value);
    setShowError(false);
  }

  function handleNext() {
    if (!isAnswered(question, answer)) {
      setShowError(true);
      return;
    }
    onStep(step + 1);
  }

  const kicker = step === 0 && firstName ? `Hallo ${firstName}!` : 'Bevor es losgeht';
  const errorText =
    question.type !== 'single' && answer?.gate === 'yes'
      ? 'Bitte wähle mindestens einen Punkt aus oder ändere die Antwort oben.'
      : 'Bitte wähle eine Antwort aus.';

  return (
    <main className="screen screen-questions">
      <header className="screen-top">
        <button type="button" className="link-button" onClick={() => onStep(step - 1)}>
          <ChevronLeft aria-hidden="true" />
          Zurück
        </button>
      </header>

      <div className="round-status">
        <p className="round-count">
          <strong>Frage {step + 1}</strong> von {questions.length}
        </p>
        <SegmentedProgress answered={step} total={questions.length} label="Fortschritt der Fragen" />
      </div>

      <div className="question-head">
        <p className="kicker">{kicker}</p>
        <h1 id={`q-${question.id}`} ref={headingRef} tabIndex={-1}>
          {question.title}
        </h1>
        <p className="lead">{question.hint}</p>
      </div>

      {question.type === 'single' ? (
        <ChoiceList name={question.id} options={question.options} value={answer} onChange={update} labelledBy={`q-${question.id}`} />
      ) : (
        <>
          <ChoiceList
            name={question.id}
            layout="row"
            options={question.gate}
            value={answer.gate}
            onChange={(gate) => update({ ...answer, gate })}
            labelledBy={`q-${question.id}`}
          />
          {answer.gate === 'yes' && (
            <section className="detail-block" aria-labelledby={`d-${question.id}`}>
              <h2 id={`d-${question.id}`}>{question.detailTitle}</h2>
              <p className="note">{question.detailHint}</p>
              {question.type === 'allergens' && <AllergenPicker data={allergens} answer={answer} onChange={update} />}
              {question.type === 'never' && (
                <NeverPicker question={question} catalogIndex={catalogIndex} answer={answer} onChange={update} />
              )}
            </section>
          )}
          {question.type === 'allergens' && answer.gate === 'unsure' && (
            <p className="notice">
              <CircleHelp aria-hidden="true" />
              {ONBOARDING.unsureHint}
            </p>
          )}
        </>
      )}

      {showError && !isAnswered(question, answer) && (
        <p className="form-error" role="alert" ref={errorRef}>
          <CircleAlert aria-hidden="true" />
          {errorText}
        </p>
      )}

      <div className="sticky-actions">
        <button type="button" className="button-primary" onClick={handleNext}>
          {last ? 'Zur Übersicht' : 'Weiter'}
        </button>
      </div>
    </main>
  );
}
