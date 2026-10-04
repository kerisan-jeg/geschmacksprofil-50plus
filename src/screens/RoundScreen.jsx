import { useEffect, useRef, useState } from 'react';
import { Undo2, X } from 'lucide-react';
import SwipeCard from '../components/SwipeCard.jsx';
import AnswerButtons from '../components/AnswerButtons.jsx';
import SegmentedProgress from '../components/SegmentedProgress.jsx';
import { FEATURES } from '../config.js';
import { nextCard, progress } from '../logic/engine.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';

// Tastatur für Demos am Laptop: Pfeiltasten und K für "Kenne ich nicht".
const KEY_TO_ANSWER = { ArrowLeft: DISLIKE, ArrowRight: LIKE, ArrowUp: PREFER, k: UNFAMILIAR, K: UNFAMILIAR };

export default function RoundScreen({ round, canUndo, onAnswer, onUndo, onEndRound }) {
  const card = nextCard(round);
  const { answered, total } = progress(round);
  const cardRef = useRef(null);
  const shownAt = useRef(0);
  const [intent, setIntent] = useState(null);

  useEffect(() => {
    shownAt.current = performance.now();
    setIntent(null);
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
  const remaining = total - answered;

  function handleCommitted(answer, method, decidedAt) {
    onAnswer(card, answer, method, Math.round(decidedAt - shownAt.current), position);
  }

  return (
    <main className="screen screen-round">
      <header className="round-top">
        <button type="button" className="link-button" onClick={onEndRound}>
          <X aria-hidden="true" />
          Runde beenden
        </button>
        {FEATURES.undo && (
          <button type="button" className="link-button" onClick={onUndo} disabled={!canUndo}>
            <Undo2 aria-hidden="true" />
            Rückgängig
          </button>
        )}
      </header>

      <div className="round-status">
        <p className="round-count"><strong>Karte {position}</strong> von {total}</p>
        <SegmentedProgress answered={answered} total={total} />
      </div>

      <div className="deck" style={{ '--lift': intent?.strength ?? 0 }}>
        {remaining > 2 && <div className="deck-layer deck-layer-2" aria-hidden="true" />}
        {remaining > 1 && <div className="deck-layer deck-layer-1" aria-hidden="true" />}
        <SwipeCard key={card.id} ref={cardRef} card={card} onCommitted={handleCommitted} onIntent={setIntent} />
      </div>
      <p className="sr-only" aria-live="polite">Karte {position} von {total}: {card.title}</p>

      <AnswerButtons intent={intent} onAnswer={(answer) => cardRef.current?.commit(answer, 'button')} />
    </main>
  );
}
