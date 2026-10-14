import { ANSWER_META } from './answerMeta.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';

// Jede Wischrichtung hat einen gleichwertigen Knopf, dort, wohin die Karte fliegt:
// links Mag ich nicht, Mitte (oben) Mag ich sehr, rechts Mag ich. Wischen nach oben ist für viele
// schwierig, der Knopf in der Mitte ersetzt es vollständig. Beim Ziehen leuchtet der passende Knopf mit.
// Darunter „Kenne ich nicht“ als eigener Knopf und „Vertrage ich nicht“ bewusst nur als
// dezenter Textlink (A4): keine fünfte Richtung, kein gleichwertiger fünfter Knopf,
// aber eine Tippfläche von mindestens 44 × 44 px.
export const ROW = [DISLIKE, PREFER, LIKE];

export default function AnswerButtons({ onAnswer, onIntolerant, intent, disabled = false }) {
  const unknown = ANSWER_META[UNFAMILIAR];
  const intolerant = ANSWER_META[INTOLERANT];

  return (
    <div className="answer-bar">
      <div className="answer-row">
        {ROW.map((answer) => {
          const { label, Icon, tone } = ANSWER_META[answer];
          const strength = intent?.answer === answer ? intent.strength : 0;
          return (
            <button
              key={answer}
              type="button"
              className={`answer tone-${tone}`}
              style={{ '--s': strength }}
              data-hot={strength > 0.55 || undefined}
              data-answer={answer}
              disabled={disabled}
              onClick={() => onAnswer(answer)}
            >
              <span className="answer-circle">
                <Icon aria-hidden="true" />
              </span>
              <span className="answer-label">{label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={`answer-unknown tone-${unknown.tone}`}
        data-answer={UNFAMILIAR}
        disabled={disabled}
        onClick={() => onAnswer(UNFAMILIAR)}
      >
        <unknown.Icon aria-hidden="true" />
        {unknown.label}
      </button>
      <button type="button" className="button-link answer-intolerant" data-answer={INTOLERANT} disabled={disabled} onClick={onIntolerant}>
        {intolerant.label}
      </button>
    </div>
  );
}
