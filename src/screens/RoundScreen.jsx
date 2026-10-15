import { useEffect, useRef, useState } from 'react';
import { Ban, Undo2, X } from 'lucide-react';
import SwipeCard from '../components/SwipeCard.jsx';
import CardFace from '../components/CardFace.jsx';
import AnswerButtons from '../components/AnswerButtons.jsx';
import DetailPicker from '../components/DetailPicker.jsx';
import SegmentedProgress from '../components/SegmentedProgress.jsx';
import TopBar from '../components/TopBar.jsx';
import { collapseIntolerance, intoleranceOptions, presentCard, progress, selectNextCards } from '../logic/engine.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { ROUND } from '../labels.js';
import { readDuration } from '../theme/motion.js';

// Tastatur für Demos am Laptop: Pfeiltasten und K für „Kenne ich nicht“.
const KEY_TO_ANSWER = { ArrowLeft: DISLIKE, ArrowRight: LIKE, ArrowUp: PREFER, k: UNFAMILIAR, K: UNFAMILIAR };

export default function RoundScreen({ round, config, canUndo, onAnswer, onUndo, onEndRound }) {
  // Oberste Karte und die nächste, die leicht dahinter liegt (Reihenfolge aus selectNextCards, je nach den
  // bisherigen Antworten; nach „Kenne ich nicht“ kann eine andere Karte nachrücken als die dahinter).
  const [card, behind] = selectNextCards(round, config)
    .slice(0, 2)
    .map((entry) => presentCard(round, entry));
  const { answered, total, percent } = progress(round, config);
  const cardRef = useRef(null);
  const shownAt = useRef(0);
  // Zustand gehört immer zur aktuellen Karte: Mit der nächsten Karte beginnt er leer.
  const [intentFor, setIntentFor] = useState({ cardId: null, intent: null });
  const [pickerFor, setPickerFor] = useState({ cardId: null, options: null });
  const intent = intentFor.cardId === card?.id ? intentFor.intent : null;
  const picker = pickerFor.cardId === card?.id ? pickerFor.options : null;
  const pickerOpen = useRef(false);
  pickerOpen.current = picker !== null;

  // Antwortzeit ab dem Moment, in dem die Karte vollständig sichtbar ist (nach der Einblendung).
  useEffect(() => {
    shownAt.current = performance.now() + readDuration('--duration-card-enter');
  }, [card?.id]);

  useEffect(() => {
    function handleKey(event) {
      const answer = KEY_TO_ANSWER[event.key];
      if (!answer || pickerOpen.current || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      cardRef.current?.commit(answer, 'keyboard');
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (!card) return null;

  const position = answered + 1;
  const counter = ROUND.cardOf(position, total);
  const last = round.lastEvent;

  // Bestätigung nach „Vertrage ich nicht“: direkt aus dem Event-Log abgeleitet.
  // Sie verschwindet mit der nächsten Antwort oder mit Rückgängig, ohne Zeitlimit.
  const toast =
    last?.response === INTOLERANT
      ? ROUND.intolerantToast(ROUND.listNames((last.excludedCardIds ?? [last.cardId]).map((id) => round.index.get(id).title)))
      : null;

  function handleCommitted(answer, method, decidedAt, extra) {
    onAnswer(card, answer, method, Math.max(0, Math.round(decidedAt - shownAt.current)), position, extra?.excludedCardIds);
  }

  function handleIntolerant() {
    const options = intoleranceOptions(round, card);
    if (options) setPickerFor({ cardId: card.id, options });
    else cardRef.current?.commit(INTOLERANT, 'link', { excludedCardIds: [card.id] });
  }

  return (
    <main className="screen screen-round">
      <TopBar
        start={
          <button type="button" className="button-ghost" onClick={onEndRound}>
            <X aria-hidden="true" />
            {ROUND.endRound}
          </button>
        }
        end={
          canUndo && (
            <button type="button" className="button-ghost is-strong" onClick={onUndo}>
              <Undo2 aria-hidden="true" />
              {ROUND.undo}
            </button>
          )
        }
      />

      <div className="round-status">
        {toast ? (
          <div className="toast">
            <Ban aria-hidden="true" />
            <p>{toast}</p>
            <button type="button" className="toast-action" onClick={onUndo}>
              {ROUND.undo}
            </button>
          </div>
        ) : (
          <SegmentedProgress
            answered={answered}
            total={total}
            percent={percent}
            counter={counter}
            label={ROUND.progressLabel}
            valueText={ROUND.progressText(answered, total)}
          />
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {toast ?? ROUND.announce(position, total, card.title)}
      </p>

      <div className="deck" style={{ '--lift': intent?.strength ?? 0 }}>
        {behind && (
          <div key={behind.id} className="deck-behind" aria-hidden="true" inert>
            <CardFace card={behind} />
          </div>
        )}
        <SwipeCard
          key={card.id}
          ref={cardRef}
          card={card}
          onCommitted={handleCommitted}
          onIntent={(next) => setIntentFor({ cardId: card.id, intent: next })}
        />
      </div>

      <AnswerButtons intent={intent} onAnswer={(answer) => cardRef.current?.commit(answer, 'button')} onIntolerant={handleIntolerant} />

      {picker && (
        <DetailPicker
          title={ROUND.intolerantPickerTitle}
          intro={ROUND.intolerantPickerIntro(card.title)}
          allLabel={ROUND.intolerantAll(card.title)}
          sections={picker.sections}
          onCancel={() => setPickerFor({ cardId: null, options: null })}
          onConfirm={(ids) => {
            setPickerFor({ cardId: null, options: null });
            cardRef.current?.commit(INTOLERANT, 'link', { excludedCardIds: collapseIntolerance(round, card, ids) });
          }}
        />
      )}
    </main>
  );
}
