import { useEffect, useRef, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import ChoiceList from '../components/ChoiceList.jsx';
import AllergenPicker from '../components/AllergenPicker.jsx';
import DietPicker from '../components/DietPicker.jsx';
import NeverPicker from '../components/NeverPicker.jsx';
import SegmentedProgress from '../components/SegmentedProgress.jsx';
import TopBar, { BackButton } from '../components/TopBar.jsx';
import Avatar from '../components/Avatar.jsx';
import { isAnswered, SCOPED_INTOLERANCES, SCOPES } from '../logic/stage0.js';
import { ONBOARDING, QUESTIONS } from '../labels.js';

// Zusätze zu Frage 2 (nurec v0.2, Kap. 2.1): Quelle der Vorgabe (0.2, „ärztlich festgestellt“) und bei
// Unverträglichkeiten der Geltungsbereich (0.3, „ganz meiden“ oder „kleine Mengen gehen“). Beides ist freiwillig
// und ändert nichts am Ausschluss: Eine Mengengrenze gilt nie als sichere Freigabe.
function ConstraintDetails({ allergens, answer, onChange }) {
  const scoped = SCOPED_INTOLERANCES.filter((id) => answer.selected.includes(id));
  const scopeOptions = [
    { id: SCOPES.AVOID, label: ONBOARDING.scopes.avoid },
    { id: SCOPES.LIMITED, label: ONBOARDING.scopes.limited },
  ];
  return (
    <div className="stack constraint-details">
      <ChoiceList
        name="medical"
        multiple
        options={[{ id: 'medical', label: ONBOARDING.medical, detail: ONBOARDING.medicalHint }]}
        value={answer.medical ? ['medical'] : []}
        onChange={() => onChange({ ...answer, medical: !answer.medical })}
      />
      {scoped.map((id) => {
        const name = allergens.categories.find((category) => category.id === id)?.tileLabel ?? id;
        return (
          <section key={id} className="stack-tight" aria-labelledby={`scope-${id}`}>
            <h3 id={`scope-${id}`} className="chips-title">
              {ONBOARDING.scopeTitle(name)}
            </h3>
            <ChoiceList
              name={`scope-${id}`}
              layout="row"
              options={scopeOptions}
              value={answer.scopes?.[id] ?? SCOPES.AVOID}
              onChange={(scope) => onChange({ ...answer, scopes: { ...(answer.scopes ?? {}), [id]: scope } })}
              labelledBy={`scope-${id}`}
            />
            {(answer.scopes?.[id] ?? SCOPES.AVOID) === SCOPES.LIMITED && <p className="note">{ONBOARDING.scopeNote}</p>}
          </section>
        );
      })}
    </div>
  );
}

// Stufe 0 als kurzer Fragebogen: eine Frage pro Bildschirm.
// Erst bei „Ja“ erscheint die Detailauswahl (nurec v0.2, Kap. 2: nur bei „vorhanden“ nachfragen).
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
                <>
                  <AllergenPicker data={allergens} catalogIndex={catalogIndex} foods={foods} answer={answer} redundancy={redundancy} onChange={update} />
                  <ConstraintDetails allergens={allergens} answer={answer} onChange={update} />
                </>
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
