import { ANSWER_LABELS } from '../config.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { IconArrowLeft, IconArrowRight, IconArrowUp, IconQuestion } from './Icons.jsx';

// Die Knöpfe liegen dort, wohin die Karte gewischt wird: links, oben (Mitte), rechts.
// So lernt man die Gesten nebenbei, kann aber jederzeit einfach tippen.
export default function AnswerButtons({ onAnswer }) {
  return (
    <div className="answers">
      <div className="answers-row">
        <button type="button" className="answer answer-dislike" onClick={() => onAnswer(DISLIKE)}>
          <IconArrowLeft />
          <span>{ANSWER_LABELS[DISLIKE]}</span>
        </button>
        <button type="button" className="answer answer-prefer" onClick={() => onAnswer(PREFER)}>
          <IconArrowUp />
          <span>{ANSWER_LABELS[PREFER]}</span>
        </button>
        <button type="button" className="answer answer-like" onClick={() => onAnswer(LIKE)}>
          <IconArrowRight />
          <span>{ANSWER_LABELS[LIKE]}</span>
        </button>
      </div>
      <button type="button" className="answer answer-unfamiliar" onClick={() => onAnswer(UNFAMILIAR)}>
        <IconQuestion />
        <span>{ANSWER_LABELS[UNFAMILIAR]}</span>
      </button>
    </div>
  );
}
