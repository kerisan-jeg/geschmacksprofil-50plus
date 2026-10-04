import { ANSWER_LABELS } from '../config.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { IconArrowLeft, IconArrowRight, IconArrowUp, IconQuestion } from '../components/Icons.jsx';

const ROWS = [
  { answer: DISLIKE, Icon: IconArrowLeft, how: 'Nach links wischen oder tippen' },
  { answer: LIKE, Icon: IconArrowRight, how: 'Nach rechts wischen oder tippen' },
  { answer: PREFER, Icon: IconArrowUp, how: 'Nach oben wischen oder tippen' },
  { answer: UNFAMILIAR, Icon: IconQuestion, how: 'Tippen, wenn du es nicht kennst' },
];

export default function IntroScreen({ onContinue }) {
  return (
    <main className="screen screen-intro">
      <h1>So antwortest du</h1>
      <p className="lead">Wische die Karte in eine Richtung oder tippe auf den passenden Knopf. Beides zählt gleich.</p>

      <ul className="howto">
        {ROWS.map(({ answer, Icon, how }) => (
          <li key={answer} className={`howto-row howto-${answer.toLowerCase()}`}>
            <span className="howto-icon"><Icon /></span>
            <span>
              <span className="howto-label">{ANSWER_LABELS[answer]}</span>
              <span className="howto-how">{how}</span>
            </span>
          </li>
        ))}
      </ul>

      <p>
        Es gibt keine falschen Antworten. „{ANSWER_LABELS[DISLIKE]}“ ist kein Verbot:
        Ausnahmen fragen wir später gezielt nach.
      </p>

      <div className="screen-actions">
        <button type="button" className="primary" onClick={onContinue}>Erste Karte zeigen</button>
      </div>
    </main>
  );
}
