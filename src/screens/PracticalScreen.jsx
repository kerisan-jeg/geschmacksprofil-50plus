import { useEffect, useRef, useState } from 'react';
import BrandField from '../components/BrandField.jsx';
import ChoiceList from '../components/ChoiceList.jsx';
import SegmentedProgress from '../components/SegmentedProgress.jsx';
import TopBar, { BackButton } from '../components/TopBar.jsx';
import { EMPTY_PRACTICAL } from '../logic/practical.js';
import { PRACTICAL } from '../labels.js';

// Alltagsprofil (nurec v0.2, Kap. 2.3 „Practical Suitability“): freiwillig, nach den Geschmacksrunden.
// Eine Frage pro Bildschirm wie beim Fragebogen. Jede Frage lässt sich überspringen; dann bleibt sie „unbekannt“.
// Die Fragen stehen als Daten in src/data/practical.json. Gespeichert wird erst mit „Fertig“ (onSave);
// „Zurück“ auf der ersten Frage schliesst ohne zu speichern (onCancel).
export default function PracticalScreen({ definition, initial, onSave, onCancel }) {
  const questions = definition.questions;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => ({ ...EMPTY_PRACTICAL, ...(initial ?? {}), cookingTime: { ...EMPTY_PRACTICAL.cookingTime, ...(initial?.cookingTime ?? {}) } }));
  const headingRef = useRef(null);
  const question = questions[step];
  const last = step === questions.length - 1;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo?.(0, 0);
  }, [step]);

  function set(changes) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function forward(next = draft) {
    if (last) onSave(next);
    else setStep(step + 1);
  }

  // Überspringen: Diese Frage bleibt unbekannt (auch eine frühere Angabe wird zurückgesetzt).
  function skip() {
    const cleared = { ...draft };
    if (question.type === 'pair') cleared[question.id] = { ...EMPTY_PRACTICAL.cookingTime };
    else cleared[question.id] = null;
    if (question.follow) cleared[question.follow.id] = null;
    if (question.id === 'shops') Object.assign(cleared, { brandsPreferred: [], brandsAvoided: [] });
    setDraft(cleared);
    forward(cleared);
  }

  const counter = PRACTICAL.counter(step + 1, questions.length);
  const value = draft[question.id];

  return (
    <main className="screen screen-practical">
      <TopBar start={<BackButton onClick={() => (step === 0 ? onCancel() : setStep(step - 1))} />} />

      <SegmentedProgress
        answered={step}
        total={questions.length}
        percent={Math.round((step / questions.length) * 100)}
        counter={counter}
        label={PRACTICAL.progressLabel}
        valueText={`${counter.strong}${counter.rest}`}
      />

      <div className="stack">
        <p className="kicker">{PRACTICAL.kicker}</p>
        <h1 id={`p-${question.id}`} ref={headingRef} tabIndex={-1}>
          {question.title}
        </h1>
        <p className="lead">{question.hint}</p>
        {step === 0 && <p className="note">{PRACTICAL.lead}</p>}
      </div>

      {question.type === 'pair' &&
        question.parts.map((part) => (
          <section key={part.id} className="stack-tight" aria-labelledby={`p-${question.id}-${part.id}`}>
            <h2 id={`p-${question.id}-${part.id}`} className="title-section">
              {part.label}
            </h2>
            <ChoiceList
              name={`${question.id}-${part.id}`}
              options={question.options}
              value={value?.[part.id] ?? null}
              onChange={(id) => set({ [question.id]: { ...value, [part.id]: id } })}
              labelledBy={`p-${question.id}-${part.id}`}
            />
          </section>
        ))}

      {question.type === 'single' && (
        <ChoiceList name={question.id} options={question.options} value={value} onChange={(id) => set({ [question.id]: id })} labelledBy={`p-${question.id}`} />
      )}

      {question.type === 'multi' && (
        <ChoiceList
          name={question.id}
          multiple
          options={question.options}
          value={value ?? []}
          onChange={(id) => {
            const current = value ?? [];
            const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
            set({ [question.id]: next.length > 0 ? next : null });
          }}
          labelledBy={`p-${question.id}`}
        />
      )}

      {question.follow && (
        <section className="stack-tight" aria-labelledby={`p-${question.follow.id}`}>
          <h2 id={`p-${question.follow.id}`} className="title-section">
            {question.follow.title}
          </h2>
          <ChoiceList
            name={question.follow.id}
            options={question.follow.options}
            value={draft[question.follow.id]}
            onChange={(id) => set({ [question.follow.id]: id })}
            labelledBy={`p-${question.follow.id}`}
          />
        </section>
      )}

      {question.id === 'shops' && (
        <div className="stack">
          <BrandField
            label={PRACTICAL.brandsPreferred}
            placeholder={PRACTICAL.brandsPlaceholder}
            values={draft.brandsPreferred}
            onChange={(next) => set({ brandsPreferred: next })}
          />
          <BrandField
            label={PRACTICAL.brandsAvoided}
            placeholder={PRACTICAL.brandsPlaceholder}
            values={draft.brandsAvoided}
            onChange={(next) => set({ brandsAvoided: next })}
          />
          <p className="note">{PRACTICAL.brandsHint}</p>
        </div>
      )}

      {last && <p className="note">{PRACTICAL.noEffect}</p>}

      <div className="action-bar">
        <button type="button" className="button-primary" onClick={() => forward()}>
          {last ? PRACTICAL.done : PRACTICAL.next}
        </button>
        <button type="button" className="button-ghost is-strong" onClick={skip}>
          {PRACTICAL.skip}
        </button>
      </div>
    </main>
  );
}
