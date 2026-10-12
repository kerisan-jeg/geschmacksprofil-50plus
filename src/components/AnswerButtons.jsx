import { ANSWER_META } from './answerMeta.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';

// Die drei Knöpfe liegen dort, wohin die Karte gewischt wird: links, oben (Mitte), rechts.
// Beim Wischen wächst der passende Knopf mit, so lernt man die Gesten nebenbei.
// Darunter „Kenne ich nicht“ als eigener Knopf und „Vertrage ich nicht“ bewusst nur als
// dezenter Textlink (A4): keine fünfte Richtung, kein gleichwertiger fünfter Knopf,
// aber eine Tippfläche von mindestens 44 × 44 px.
const ROW = [DISLIKE, PREFER, LIKE];

export default function AnswerButtons({ onAnswer, onIntolerant, intent, disabled = false }) {
  const unknown = ANSWER_META[UNFAMILIAR];
  const intolerant = ANSWER_META[INTOLERANT];

  return (
    <div className="actions">
      <div className="actions-row">
        {ROW.map((answer) => {
          const { label, Icon, tone } = ANSWER_META[answer];
          const strength = intent?.answer === answer ? intent.strength : 0;
          return (
            <button
              key={answer}
              type="button"
              className={`action tone-${tone}`}
              style={{ '--s': strength }}
              data-hot={strength > 0.55 || undefined}
              disabled={disabled}
              onClick={() => onAnswer(answer)}
            >
              <span className="action-circle">
                <Icon aria-hidden="true" strokeWidth={2.2} />
              </span>
              <span className="action-label">{label}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="action-unknown tone-unknown" disabled={disabled} onClick={() => onAnswer(UNFAMILIAR)}>
        <unknown.Icon aria-hidden="true" strokeWidth={2.2} />
        {unknown.label}
      </button>
      <button type="button" className="action-intolerant" disabled={disabled} onClick={onIntolerant}>
        {intolerant.label}
      </button>
    </div>
  );
}
