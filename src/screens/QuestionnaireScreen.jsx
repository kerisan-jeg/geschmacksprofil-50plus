import { useEffect, useRef, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import ChoiceList from '../components/ChoiceList.jsx';
import AllergenPicker from '../components/AllergenPicker.jsx';
import DietPicker from '../components/DietPicker.jsx';
import NeverPicker from '../components/NeverPicker.jsx';
import SegmentedProgress from '../components/SegmentedProgress.jsx';
import TopBar, { BackButton } from '../components/TopBar.jsx';
import Avatar from '../components/Avatar.jsx';
import { isAnswered } from '../logic/stage0.js';
import { QUESTIONS } from '../labels.js';

// Stufe 0 als kurzer Fragebogen: eine Frage pro Bildschirm.
// Erst bei „Ja“ erscheint die Detailauswahl (nurec v0.2, Kap. 2: nur bei „vorhanden“ nachfragen).
// Teamentscheid 28.10.2026: Frage 2 ohne Zusatzangaben („ärztlich festgestellt“, „kleine Mengen gehen“,
// „nicht sicher, ob es weitere gibt“), Frage 3 ohne Marken und Herkunft.
// editing: über „Ändern“ aus der Zusammenfassung geöffnet. Dann führen „Zurück“ und der Hauptknopf
// zurück zur Übersicht, aber erst mit einer gültigen Antwort (keine offene Sicherheitsfrage).
export default function QuestionnaireScreen({ definition, questions, step, answers, firstName, allergens, catalogIndex, foods, redundancy, onChange, onStep, onOpenProfile, editing = false }) {
  const question = questions[step];
  const answer = answers[question.id];
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
    onStep(editing ? questions.length : step + 1);
  }

  let kicker = step === 0 && firstName ? QUESTIONS.hello(firstName) : QUESTIONS.kicker;
  if (editing) kicker = QUESTIONS.editKicker;
  const errorText = question.type !== 'single' && answer?.gate === 'yes' ? QUESTIONS.errorDetails : QUESTIONS.errorChoose;
  const percent = Math.round((step / questions.length) * 100);
  const counter = QUESTIONS.counter(step + 1, questions.length);

  return (
    <main className="screen screen-questions">
      <TopBar start={<BackButton onClick={editing ? handleNext : () => onStep(step - 1)} />} end={<Avatar name={firstName} onClick={onOpenProfile} />} />

      <SegmentedProgress
        answered={step}
        total={questions.length}
        percent={percent}
        counter={counter}
        label={QUESTIONS.progressLabel}
        valueText={`${counter.strong}${counter.rest}`}
      />

      <div className="stack">
        <p className="kicker">{kicker}</p>
        <h1 id={`q-${question.id}`} ref={headingRef} tabIndex={-1}>
          {question.title}
        </h1>
        <p className="lead">{question.hint}</p>
      </div>

      {question.type === 'diet' && <DietPicker definition={definition} question={question} answer={answer} onChange={update} />}
      {question.type === 'single' && (
        <ChoiceList name={question.id} options={question.options} value={answer} onChange={update} labelledBy={`q-${question.id}`} />
      )}
      {question.type !== 'single' && question.type !== 'diet' && (
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
              <div className="stack-tight">
                <h2 id={`d-${question.id}`} className="title-section">
                  {question.detailTitle}
                </h2>
                <p className="note">{question.detailHint}</p>
              </div>
              {question.type === 'allergens' && (
                <AllergenPicker data={allergens} catalogIndex={catalogIndex} foods={foods} answer={answer} redundancy={redundancy} onChange={update} />
              )}
              {question.type === 'never' && (
                <NeverPicker question={question} catalogIndex={catalogIndex} foods={foods} answer={answer} redundancy={redundancy} onChange={update} />
              )}
            </section>
          )}
        </>
      )}

      {showError && !isAnswered(question, answer) && (
        <p className="form-error" role="alert" ref={errorRef}>
          <CircleAlert aria-hidden="true" />
          {errorText}
        </p>
      )}

      <div className="action-bar">
        <button type="button" className="button-primary" onClick={handleNext}>
          {editing ? QUESTIONS.backToSummary : QUESTIONS.next}
        </button>
      </div>
    </main>
  );
}
