import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Ban, Undo2, X } from 'lucide-react';
import SwipeCard from '../components/SwipeCard.jsx';
import AnswerButtons from '../components/AnswerButtons.jsx';
import DetailPicker from '../components/DetailPicker.jsx';
import SegmentedProgress from '../components/SegmentedProgress.jsx';
import { collapseIntolerance, intoleranceOptions, nextCard, progress } from '../logic/engine.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { ROUND } from '../labels.js';
import { SWIPE } from '../config.js';

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// Tastatur für Demos am Laptop: Pfeiltasten und K für „Kenne ich nicht“.
const KEY_TO_ANSWER = { ArrowLeft: DISLIKE, ArrowRight: LIKE, ArrowUp: PREFER, k: UNFAMILIAR, K: UNFAMILIAR };

// Verkleinert nur das Kartenbild, bis die Runde ohne Scrollen auf den Bildschirm passt.
function fitArtwork(main) {
  const art = main?.querySelector('.swipe-card .artwork');
  if (!art) return;
  main.style.removeProperty('--art-h');
  delete main.dataset.compactArt;
  const overflow = document.documentElement.scrollHeight - window.innerHeight;
  if (overflow <= 0) return;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const height = Math.max(3.5 * rem, art.offsetHeight - overflow);
  main.style.setProperty('--art-h', `${height}px`);
  if (height < 6 * rem) main.dataset.compactArt = '';
}

function listNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} und ${names.at(-1)}`;
  return `${names.slice(0, 2).join(', ')} und ${names.length - 2} weitere`;
}

export default function RoundScreen({ round, config, canUndo, onAnswer, onUndo, onEndRound }) {
  const card = nextCard(round, config);
  const { answered, total } = progress(round, config);
  const cardRef = useRef(null);
  const mainRef = useRef(null);
  const shownAt = useRef(0);
  const [intent, setIntent] = useState(null);
  const [picker, setPicker] = useState(null);
  const pickerOpen = useRef(false);
  pickerOpen.current = picker !== null;

  // Antwortzeit ab dem Moment, in dem die Karte vollständig sichtbar ist (nach der Einblendung).
  useEffect(() => {
    shownAt.current = performance.now() + (prefersReducedMotion() ? 0 : SWIPE.enterMs);
    setIntent(null);
    setPicker(null);
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

  const last = round.lastEvent;
  const toastKey = last?.response === INTOLERANT ? `${last.cardId}:${(last.excludedCardIds ?? []).join(',')}` : '';

  useLayoutEffect(() => {
    const fit = () => fitArtwork(mainRef.current);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [card?.id, toastKey, canUndo]);

  if (!card) return null;

  const position = answered + 1;
  const remaining = total - answered;
  const counter = ROUND.cardOf(position, total);

  // Bestätigung nach „Vertrage ich nicht“: direkt aus dem Event-Log abgeleitet.
  // Sie verschwindet mit der nächsten Antwort oder mit Rückgängig, ohne Zeitlimit.
  const toast =
    last?.response === INTOLERANT
      ? ROUND.intolerantToast(listNames((last.excludedCardIds ?? [last.cardId]).map((id) => round.index.get(id).title)))
      : null;

  function handleCommitted(answer, method, decidedAt, extra) {
    onAnswer(card, answer, method, Math.max(0, Math.round(decidedAt - shownAt.current)), position, extra?.excludedCardIds);
  }

  function handleIntolerant() {
    const options = intoleranceOptions(round, card);
    if (options) setPicker(options);
    else cardRef.current?.commit(INTOLERANT, 'link', { excludedCardIds: [card.id] });
  }

  return (
    <main className="screen screen-round" ref={mainRef}>
      <header className="round-top">
        <button type="button" className="link-button" onClick={onEndRound}>
          <X aria-hidden="true" />
          {ROUND.endRound}
        </button>
        {canUndo && (
          <button type="button" className="link-button" onClick={onUndo}>
            <Undo2 aria-hidden="true" />
            {ROUND.undo}
          </button>
        )}
      </header>

      <div role="status" aria-live="polite">
        {toast ? (
          <div className="toast">
            <Ban aria-hidden="true" />
            <p>{toast}</p>
            <button type="button" className="toast-undo" onClick={onUndo}>{ROUND.undo}</button>
          </div>
        ) : (
          <div className="round-status">
            <p className="round-count"><strong>{counter.strong}</strong>{counter.rest}</p>
            <SegmentedProgress answered={answered} total={total} />
          </div>
        )}
      </div>

      <div className="deck" style={{ '--lift': intent?.strength ?? 0 }}>
        {remaining > 2 && <div className="deck-layer deck-layer-2" aria-hidden="true" />}
        {remaining > 1 && <div className="deck-layer deck-layer-1" aria-hidden="true" />}
        <SwipeCard key={card.id} ref={cardRef} card={card} onCommitted={handleCommitted} onIntent={setIntent} />
      </div>
      <p className="sr-only" aria-live="polite">{counter.strong}{counter.rest}: {card.title}</p>

      <AnswerButtons
        intent={intent}
        onAnswer={(answer) => cardRef.current?.commit(answer, 'button')}
        onIntolerant={handleIntolerant}
      />

      {picker && (
        <DetailPicker
          title={ROUND.intolerantPickerTitle}
          intro={ROUND.intolerantPickerIntro(card.title)}
          allLabel={ROUND.intolerantAll(card.title)}
          sections={picker.sections}
          onCancel={() => setPicker(null)}
          onConfirm={(ids) => {
            setPicker(null);
            cardRef.current?.commit(INTOLERANT, 'link', { excludedCardIds: collapseIntolerance(round, card, ids) });
          }}
        />
      )}
    </main>
  );
}
