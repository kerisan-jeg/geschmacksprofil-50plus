import { ANSWER_META } from './answerMeta.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';

// Die drei Knöpfe liegen dort, wohin die Karte gewischt wird: links, oben (Mitte), rechts.
// Beim Wischen wächst der passende Knopf mit, so lernt man die Gesten nebenbei.
const ROW = [DISLIKE, PREFER, LIKE];

export default function AnswerButtons({ onAnswer, intent }) {
  const unknown = ANSWER_META[UNFAMILIAR];

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
      <button type="button" className="action-unknown tone-unknown" onClick={() => onAnswer(UNFAMILIAR)}>
        <unknown.Icon aria-hidden="true" strokeWidth={2.2} />
        {unknown.label}
      </button>
    </div>
  );
}
