import { useImperativeHandle, useRef, useState } from 'react';
import CardImage from './CardImage.jsx';
import { ANSWER_LABELS, SWIPE } from '../config.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';

const EXIT_TRANSFORM = {
  [LIKE]: 'translate(140vw, 0) rotate(18deg)',
  [DISLIKE]: 'translate(-140vw, 0) rotate(-18deg)',
  [PREFER]: 'translate(0, -120vh)',
  [UNFAMILIAR]: 'scale(0.92)',
};

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// Welche Antwort deutet die aktuelle Wischbewegung an, und wie nah ist sie an der Schwelle (0 bis 1)?
function intentFromDrag(dx, dy) {
  if (-dy > Math.abs(dx)) return { answer: PREFER, strength: Math.min(1, -dy / SWIPE.thresholdUp) };
  if (dx > 0) return { answer: LIKE, strength: Math.min(1, dx / SWIPE.thresholdX) };
  if (dx < 0) return { answer: DISLIKE, strength: Math.min(1, -dx / SWIPE.thresholdX) };
  return null;
}

// Eine Karte, die gewischt oder über commit() von aussen beantwortet wird (Knöpfe, Tastatur).
export default function SwipeCard({ card, onCommitted, ref }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(null);
  const start = useRef(null);

  function commit(answer, method) {
    if (leaving) return;
    start.current = null;
    setDragging(false);
    setLeaving(answer);
    // Zeitpunkt der Entscheidung festhalten, damit die Animation nicht in die Antwortzeit eingeht.
    const decidedAt = performance.now();
    window.setTimeout(() => onCommitted(answer, method, decidedAt), prefersReducedMotion() ? 0 : SWIPE.exitMs);
  }

  useImperativeHandle(ref, () => ({ commit }));

  function handlePointerDown(event) {
    if (leaving || event.button > 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  }

  function handlePointerMove(event) {
    if (!start.current) return;
    setOffset({ x: event.clientX - start.current.x, y: event.clientY - start.current.y });
  }

  function handlePointerEnd() {
    if (!start.current) return;
    start.current = null;
    const intent = intentFromDrag(offset.x, offset.y);
    if (intent && intent.strength >= 1) {
      commit(intent.answer, 'swipe');
      return;
    }
    setDragging(false);
    setOffset({ x: 0, y: 0 });
  }

  const intent = leaving ? { answer: leaving, strength: 1 } : intentFromDrag(offset.x, offset.y);
  const transform = leaving
    ? EXIT_TRANSFORM[leaving]
    : `translate(${offset.x}px, ${Math.min(offset.y, 0)}px) rotate(${offset.x / 18}deg)`;

  const classes = ['swipe-card'];
  if (dragging) classes.push('is-dragging');
  if (leaving === UNFAMILIAR) classes.push('is-fading');

  return (
    <article
      className={classes.join(' ')}
      style={{ transform }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      aria-roledescription="Karte"
      aria-label={`${card.title}. Zum Beispiel ${card.examples.join(', ')}`}
    >
      <CardImage card={card} />
      {intent && intent.answer !== UNFAMILIAR && intent.strength > 0.15 && (
        <span className={`stamp stamp-${intent.answer.toLowerCase()}`} style={{ opacity: intent.strength }} aria-hidden="true">
          {ANSWER_LABELS[intent.answer]}
        </span>
      )}
      <div className="card-text">
        <h2 className="card-title">{card.title}</h2>
        <p className="card-examples">z. B. {card.examples.join(', ')}</p>
      </div>
    </article>
  );
}
