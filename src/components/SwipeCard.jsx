import { useImperativeHandle, useRef, useState } from 'react';
import CardFace from './CardFace.jsx';
import { metaFor } from './answerMeta.js';
import { FEATURES, SWIPE } from '../config.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { labelOpacity, releaseMotion, resolveRelease, swipeIntent } from '../logic/swipe.js';
import { allowsPrefer, SCALE_VARIANTS } from '../logic/scale.js';
import { ROUND } from '../labels.js';
import { readDuration } from '../theme/motion.js';

// Wohin die Karte nach einer Antwort fliegt. Kenne ich nicht / Vertrage ich nicht: ausblenden statt wegwischen.
const EXIT_TRANSFORM = {
  [LIKE]: 'translate(130vw, 4vh) rotate(16deg)',
  [DISLIKE]: 'translate(-130vw, 4vh) rotate(-16deg)',
  [PREFER]: 'translate(0, -115vh) rotate(-2deg)',
  [UNFAMILIAR]: 'translate(0, 4vh) scale(0.92)',
  [INTOLERANT]: 'translate(0, 4vh) scale(0.92)',
};

function vibrate() {
  if (!FEATURES.haptics) return;
  try {
    navigator.vibrate?.(12);
  } catch {
    // Nicht unterstützt: kein Problem.
  }
}

// Karte, die gewischt oder über commit() von aussen beantwortet wird (Knöpfe, Link, Tastatur).
// Die Gestenlogik (Schwelle, Rückfederung, Schnippen) steht rein und getestet in logic/swipe.js.
// extra wird unverändert an onCommitted weitergegeben (z. B. excludedCardIds bei INTOLERANT).
// variant: Begriffe je Runde (scale.js); ohne „Sehr gern“ gibt es kein Wischen nach oben.
export default function SwipeCard({ card, onCommitted, onIntent, ref, variant = SCALE_VARIANTS.STANDARD }) {
  const gesture = { allowUp: allowsPrefer(variant) };
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(null);
  const drag = useRef(null);

  function commit(answer, method, extra) {
    if (leaving) return;
    drag.current = null;
    setDragging(false);
    setLeaving(answer);
    // Auch bei Knopf und Tastatur: Der passende Knopf leuchtet auf, die nächste Karte rückt nach.
    onIntent?.({ answer, strength: 1 });
    vibrate();
    // Zeitpunkt der Entscheidung festhalten, damit die Animation nicht in die Antwortzeit eingeht.
    const decidedAt = performance.now();
    const wait = readDuration('--duration-swipe-exit');
    if (wait > 0) window.setTimeout(() => onCommitted(answer, method, decidedAt, extra), wait);
    else onCommitted(answer, method, decidedAt, extra);
  }

  useImperativeHandle(ref, () => ({ commit }));

  function handlePointerDown(event) {
    if (leaving || event.button > 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
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
    onIntent?.(swipeIntent(dx, dy, SWIPE, gesture));
  }

  function handlePointerEnd() {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    const answer = resolveRelease(releaseMotion(current.samples), SWIPE, gesture);
    if (answer) {
      commit(answer, 'swipe');
      return;
    }
    // Unter der Schwelle: zurückfedern, keine Antwort.
    setDragging(false);
    setOffset({ x: 0, y: 0 });
    onIntent?.(null);
  }

  // Beim Wegfliegen zeigt die Karte die gewählte Antwort; „Vertrage ich nicht“ bestätigt ein Hinweis oben.
  const intent = leaving ? (leaving === INTOLERANT ? null : { answer: leaving, strength: 1 }) : swipeIntent(offset.x, offset.y, SWIPE, gesture);
  const lift = offset.y < 0 ? offset.y : offset.y * 0.25;
  const transform = leaving ? EXIT_TRANSFORM[leaving] : `translate(${offset.x}px, ${lift}px) rotate(${offset.x / 16}deg)`;
  const meta = intent ? metaFor(intent.answer, variant) : null;
  const opacity = intent ? labelOpacity(intent.strength, SWIPE) : 0;

  const classes = ['swipe-card'];
  if (dragging) classes.push('is-dragging');
  if (leaving === UNFAMILIAR || leaving === INTOLERANT) classes.push('is-fading');

  return (
    <article
      className={classes.join(' ')}
      style={{ transform }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      aria-roledescription={ROUND.cardRole}
      aria-label={ROUND.cardDescription(card)}
    >
      <div className="swipe-card-inner">
        <CardFace card={card}>
          {meta && opacity > 0 && (
            <div className={`feedback tone-${meta.tone}`} style={{ '--s': opacity }} aria-hidden="true" data-answer={intent.answer}>
              <span className="feedback-tint" />
              <span className="feedback-badge">
                <meta.Icon />
                {meta.label}
              </span>
            </div>
          )}
        </CardFace>
      </div>
    </article>
  );
}
