import { useImperativeHandle, useRef, useState } from 'react';
import CardFace from './CardFace.jsx';
import { ANSWER_META } from './answerMeta.js';
import { FEATURES, SWIPE } from '../config.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';

const EXIT_TRANSFORM = {
  [LIKE]: 'translate(130vw, 4vh) rotate(16deg)',
  [DISLIKE]: 'translate(-130vw, 4vh) rotate(-16deg)',
  [PREFER]: 'translate(0, -115vh) rotate(-2deg)',
  [UNFAMILIAR]: 'translate(0, 5vh) scale(0.9)',
};

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// Welche Antwort deutet die Bewegung an, und wie nah ist sie an der Schwelle (0 bis 1)?
function intentFromOffset(dx, dy) {
  if (-dy > Math.abs(dx)) return { answer: PREFER, strength: Math.min(1, -dy / SWIPE.thresholdUp) };
  if (dx > 0) return { answer: LIKE, strength: Math.min(1, dx / SWIPE.thresholdX) };
  if (dx < 0) return { answer: DISLIKE, strength: Math.min(1, -dx / SWIPE.thresholdX) };
  return null;
}

// Ein schneller, kurzer Wisch zählt auch, wenn die Distanz noch nicht erreicht ist.
function flingAnswer(dx, dy, vx, vy) {
  const { flingVelocity: v, flingMinDistance: d } = SWIPE;
  if (-dy > Math.abs(dx) && -dy > d && -vy > v) return PREFER;
  if (Math.abs(dx) > d && Math.abs(vx) > v && Math.sign(vx) === Math.sign(dx)) return dx > 0 ? LIKE : DISLIKE;
  return null;
}

function vibrate() {
  if (!FEATURES.haptics) return;
  try {
    navigator.vibrate?.(12);
  } catch {
    // Nicht unterstützt: kein Problem.
  }
}

// Karte, die gewischt oder über commit() von aussen beantwortet wird (Knöpfe, Tastatur).
export default function SwipeCard({ card, onCommitted, onIntent, ref }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(null);
  const drag = useRef(null);

  function commit(answer, method) {
    if (leaving) return;
    drag.current = null;
    setDragging(false);
    setLeaving(answer);
    onIntent?.({ answer, strength: 1 });
    vibrate();
    // Zeitpunkt der Entscheidung festhalten, damit die Animation nicht in die Antwortzeit eingeht.
    const decidedAt = performance.now();
    window.setTimeout(() => onCommitted(answer, method, decidedAt), prefersReducedMotion() ? 0 : SWIPE.exitMs);
  }

  useImperativeHandle(ref, () => ({ commit }));

  function handlePointerDown(event) {
    if (leaving || event.button > 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, samples: [{ dx: 0, dy: 0, t: performance.now() }] };
    setDragging(true);
  }

  function handlePointerMove(event) {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    current.samples = [...current.samples.slice(-5), { dx, dy, t: performance.now() }];
    setOffset({ x: dx, y: dy });
    onIntent?.(intentFromOffset(dx, dy));
  }

  function handlePointerEnd() {
    const current = drag.current;
    if (!current) return;
    drag.current = null;

    const last = current.samples.at(-1);
    const first = current.samples.find((sample) => last.t - sample.t < 120) ?? last;
    const dt = Math.max(1, last.t - first.t);
    const fling = flingAnswer(last.dx, last.dy, (last.dx - first.dx) / dt, (last.dy - first.dy) / dt);
    const intent = intentFromOffset(last.dx, last.dy);

    if (fling || (intent && intent.strength >= 1)) {
      commit(fling ?? intent.answer, 'swipe');
      return;
    }
    setDragging(false);
    setOffset({ x: 0, y: 0 });
    onIntent?.(null);
  }

  const intent = leaving ? { answer: leaving, strength: 1 } : intentFromOffset(offset.x, offset.y);
  const lift = offset.y < 0 ? offset.y : offset.y * 0.25;
  const transform = leaving ? EXIT_TRANSFORM[leaving] : `translate(${offset.x}px, ${lift}px) rotate(${offset.x / 16}deg)`;
  const meta = intent ? ANSWER_META[intent.answer] : null;

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
      <div className="swipe-card-inner">
        <CardFace card={card}>
          {meta && intent.strength > 0.12 && (
            <div className={`feedback tone-${meta.tone}`} style={{ '--s': intent.strength }} aria-hidden="true">
              <span className="feedback-tint" />
              <span className="feedback-badge">
                <meta.Icon strokeWidth={2.4} />
                {meta.label}
              </span>
            </div>
          )}
        </CardFace>
      </div>
    </article>
  );
}
