import catalog from '../data/catalog.json';
import CardFace from '../components/CardFace.jsx';
import { ANSWER_META } from '../components/answerMeta.js';
import { ANSWER_LABELS, TUTORIAL } from '../labels.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';

const DEMO_CARD = catalog.cards.find((card) => card.id === 'F12');
const DEMO = [LIKE, DISLIKE, PREFER];

// Mini-Tutorial vor der ersten Runde. Abschaltbar über ?tutorial=0 (Vergleich im Pilot).
export default function IntroScreen({ onContinue }) {
  return (
    <main className="screen screen-intro">
      <h1>{TUTORIAL.title}</h1>
      <p className="lead">{TUTORIAL.lead}</p>

      <div className="demo" aria-hidden="true">
        <div className="demo-card">
          <CardFace card={DEMO_CARD} compact />
          {DEMO.map((answer) => {
            const { Icon, label, tone } = ANSWER_META[answer];
            return (
              <span key={answer} className={`demo-badge demo-badge-${tone} tone-${tone}`}>
                <Icon strokeWidth={2.4} />
                {label}
              </span>
            );
          })}
        </div>
      </div>

      <ul className="legend">
        {[DISLIKE, LIKE, PREFER, UNFAMILIAR, INTOLERANT].map((answer) => {
          const { Icon, label, tone, hint } = ANSWER_META[answer];
          return (
            <li key={answer} className={`legend-row tone-${tone}`}>
              <span className="legend-icon"><Icon aria-hidden="true" strokeWidth={2.2} /></span>
              <span>
                <strong>{label}</strong>
                <span className="legend-hint">{hint}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <p className="note">{TUTORIAL.noWrong(ANSWER_LABELS.DISLIKE)}</p>
      <p className="note">{TUTORIAL.undo}</p>

      <div className="screen-actions">
        <button type="button" className="button-primary" onClick={onContinue}>{TUTORIAL.start}</button>
      </div>
    </main>
  );
}
