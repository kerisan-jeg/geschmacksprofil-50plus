import catalog from '../data/catalog.json';
import CardFace from '../components/CardFace.jsx';
import { ANSWER_META } from '../components/answerMeta.js';
import { ANSWER_LABELS } from '../config.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';

const DEMO_CARD = catalog.cards.find((card) => card.id === 'F12');
const DEMO = [LIKE, DISLIKE, PREFER];

export default function IntroScreen({ onContinue }) {
  return (
    <main className="screen screen-intro">
      <h1>So antwortest du</h1>
      <p className="lead">Wische die Karte in eine Richtung oder tippe auf den passenden Knopf. Beides zählt gleich.</p>

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
        {[DISLIKE, LIKE, PREFER, UNFAMILIAR].map((answer) => {
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

      <p className="note">
        Es gibt keine falschen Antworten. „{ANSWER_LABELS.DISLIKE}“ ist kein Verbot: Ausnahmen fragen wir später gezielt nach.
      </p>

      <div className="screen-actions">
        <button type="button" className="button-primary" onClick={onContinue}>Erste Karte zeigen</button>
      </div>
    </main>
  );
}
