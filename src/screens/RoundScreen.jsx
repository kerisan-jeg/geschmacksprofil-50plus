import { useEffect, useRef } from 'react';
import SwipeCard from '../components/SwipeCard.jsx';
import AnswerButtons from '../components/AnswerButtons.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { IconUndo } from '../components/Icons.jsx';
import { FEATURES } from '../config.js';
import { nextCard, progress } from '../logic/engine.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';

// Tastatur für die Demo am Laptop: Pfeiltasten und K für "Kenne ich nicht".
const KEY_TO_ANSWER = { ArrowLeft: DISLIKE, ArrowRight: LIKE, ArrowUp: PREFER, k: UNFAMILIAR, K: UNFAMILIAR };

export default function RoundScreen({ round, canUndo, onAnswer, onUndo, onEndRound }) {
  const card = nextCard(round);
  const { answered, total } = progress(round);
  const cardRef = useRef(null);
  const shownAt = useRef(0);

  useEffect(() => {
    shownAt.current = performance.now();
  }, [card?.id]);

  useEffect(() => {
    function handleKey(event) {
      const answer = KEY_TO_ANSWER[event.key];
      if (!answer || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      cardRef.current?.commit(answer, 'keyboard');
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (!card) return null;

  const position = answered + 1;

  function handleCommitted(answer, method, decidedAt) {
    onAnswer(card, answer, method, Math.round(decidedAt - shownAt.current), position);
  }

  return (
    <main className="screen screen-round">
      <header className="round-header">
        <ProgressBar current={answered + 1} total={total} />
        <button type="button" className="text-button" onClick={onEndRound}>Runde beenden</button>
      </header>

      <div className="card-stage">
        <SwipeCard key={card.id} ref={cardRef} card={card} onCommitted={handleCommitted} />
      </div>
      <p className="sr-only" aria-live="polite">Karte {answered + 1} von {total}: {card.title}</p>

      <AnswerButtons onAnswer={(answer) => cardRef.current?.commit(answer, 'button')} />

      {FEATURES.undo && (
        <div className="round-footer">
          <button type="button" className="text-button" onClick={onUndo} disabled={!canUndo}>
            <IconUndo />
            Rückgängig
          </button>
        </div>
      )}
    </main>
  );
}
