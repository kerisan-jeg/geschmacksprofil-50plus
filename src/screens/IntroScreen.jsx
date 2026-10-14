import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Undo2 } from 'lucide-react';
import catalog from '../data/catalog.json';
import CardFace from '../components/CardFace.jsx';
import TopBar from '../components/TopBar.jsx';
import { ANSWER_META } from '../components/answerMeta.js';
import { ANSWER_LABELS, ROUND, TUTORIAL } from '../labels.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';

const DEMO_CARD = catalog.cards.find((card) => card.id === 'F12');
const DEMO_SWIPES = [PREFER, DISLIKE, LIKE];
const DEMO_ARROWS = { [PREFER]: ArrowUp, [DISLIKE]: ArrowLeft, [LIKE]: ArrowRight };

// Karte in der Mitte, die drei Wischrichtungen als beschriftete Pfeile darum herum.
// Mit Bewegung wischt die Karte nacheinander in jede Richtung, die passende Beschriftung leuchtet auf.
function SwipeDemo() {
  return (
    <div className="demo demo-gestures" aria-hidden="true">
      {DEMO_SWIPES.map((answer) => {
        const { label, tone } = ANSWER_META[answer];
        const Arrow = DEMO_ARROWS[answer];
        return (
          <span key={answer} className={`gesture gesture-${tone} tone-${tone}`}>
            {answer !== LIKE && <Arrow />}
            {label}
            {answer === LIKE && <Arrow />}
          </span>
        );
      })}
      <div className="demo-card">
        <CardFace card={DEMO_CARD} compact />
      </div>
    </div>
  );
}

function Legend({ answers }) {
  return (
    <ul className="legend">
      {answers.map((answer) => {
        const { Icon, label, tone, hint } = ANSWER_META[answer];
        return (
          <li key={answer} className={`legend-row tone-${tone}`}>
            <span className="legend-icon">
              <Icon aria-hidden="true" />
            </span>
            <span className="legend-text">
              <strong>{label}</strong>
              <span className="note">{hint}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function UndoDemo() {
  return (
    <div className="demo demo-undo" aria-hidden="true">
      <div className="demo-card demo-card-static">
        <CardFace card={DEMO_CARD} compact />
      </div>
      <span className="demo-undo-pill">
        <Undo2 />
        {ROUND.undo}
      </span>
    </div>
  );
}

const VISUALS = [
  () => <SwipeDemo />,
  () => <Legend answers={[UNFAMILIAR, INTOLERANT]} />,
  () => <UndoDemo />,
];

// Mini-Tutorial vor der ersten Runde: höchstens drei kurze Schritte.
// Abschaltbar über TUTORIAL_ENABLED in config.js oder ?tutorial=0 (Vergleich im Pilot).
export default function IntroScreen({ onContinue }) {
  const [step, setStep] = useState(0);
  const headingRef = useRef(null);
  const total = TUTORIAL.steps.length;
  const last = step === total - 1;
  const { title, text } = TUTORIAL.steps[step];
  const Visual = VISUALS[step];

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  return (
    <main className="screen screen-intro">
      <TopBar
        start={<p className="progress-text num">{TUTORIAL.stepOf(step + 1, total)}</p>}
        end={
          !last && (
            <button type="button" className="button-ghost is-strong" onClick={onContinue}>
              {TUTORIAL.skip}
            </button>
          )
        }
      />

      <div className="intro-step" key={step}>
        <Visual />
        <div className="stack">
          <h1 ref={headingRef} tabIndex={-1}>
            {title}
          </h1>
          <p className="lead">{text}</p>
          {last && <p className="note">{TUTORIAL.noWrong(ANSWER_LABELS.DISLIKE)}</p>}
        </div>
      </div>

      <div className="action-bar">
        <button type="button" className="button-primary" onClick={() => (last ? onContinue() : setStep(step + 1))}>
          {last ? TUTORIAL.start : TUTORIAL.next}
        </button>
      </div>
    </main>
  );
}
