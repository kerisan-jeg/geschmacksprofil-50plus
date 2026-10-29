import { useContext, useEffect, useRef, useState } from 'react';
import { Ban, ListChecks, Undo2, X } from 'lucide-react';
import SwipeCard from '../components/SwipeCard.jsx';
import CardFace from '../components/CardFace.jsx';
import AnswerButtons from '../components/AnswerButtons.jsx';
import DetailPicker from '../components/DetailPicker.jsx';
import SegmentedProgress from '../components/SegmentedProgress.jsx';
import RoundOverview from '../components/RoundOverview.jsx';
import Sheet from '../components/Sheet.jsx';
import TopBar from '../components/TopBar.jsx';
import { collapseIntolerance, intoleranceOptions, isDishRound, presentCard, progress, selectNextCards } from '../logic/engine.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { allowsPrefer, scaleVariant } from '../logic/scale.js';
import { cardVisual, ImageFilterContext, ImageStyleContext, imageUrls } from '../lib/images.js';
import { MAX_ROUNDS } from '../config.js';
import { ROUND, ROUNDS } from '../labels.js';
import { readDuration } from '../theme/motion.js';

// Tastatur für Demos am Laptop: Pfeiltasten und K für „Kenne ich nicht“.
const KEY_TO_ANSWER = { ArrowLeft: DISLIKE, ArrowRight: LIKE, ArrowUp: PREFER, k: UNFAMILIAR, K: UNFAMILIAR };

// rounds: Rundenübersicht (rounds.js); onNavigate: Navigationsereignis (Übersicht geöffnet/geschlossen) protokollieren.
export default function RoundScreen({ round, config, canUndo, onAnswer, onUndo, onEndRound, rounds = null, onNavigate }) {
  // Oberste Karte und die nächste, die leicht dahinter liegt (Reihenfolge aus selectNextCards, je nach den
  // bisherigen Antworten; nach „Kenne ich nicht“ kann eine andere Karte nachrücken als die dahinter).
  const queue = selectNextCards(round, config);
  const [card, behind] = queue.slice(0, 2).map((entry) => presentCard(round, entry));
  const { answered, total, percent } = progress(round, config);
  const cardRef = useRef(null);
  const imageStyle = useContext(ImageStyleContext);
  const imageFilter = useContext(ImageFilterContext);
  // Zeitmessung je Karte (A9, A15): ab dem Ende der Einblendung und erst, wenn Bild oder Platzhalter sichtbar ist.
  // Zeit in der Rundenübersicht zählt nicht (pauses).
  const timing = useRef({ cardId: null });
  // Zustand gehört immer zur aktuellen Karte: Mit der nächsten Karte beginnt er leer.
  const [intentFor, setIntentFor] = useState({ cardId: null, intent: null });
  const [pickerFor, setPickerFor] = useState({ cardId: null, options: null });
  const intent = intentFor.cardId === card?.id ? intentFor.intent : null;
  const picker = pickerFor.cardId === card?.id ? pickerFor.options : null;
  const [overviewOpen, setOverviewOpen] = useState(false);
  const dishRound = isDishRound(round.round);
  const pickerOpen = useRef(false);
  pickerOpen.current = picker !== null || overviewOpen;
  const variant = scaleVariant(card, config);
  const preferAllowed = useRef(true);
  preferAllowed.current = allowsPrefer(variant);

  function timingFor(cardId) {
    if (timing.current.cardId !== cardId) timing.current = { cardId, enterDoneAt: null, readyAt: null, image: null, pauses: [] };
    return timing.current;
  }

  // Ende der Einblendung bzw. des Überblendens bei reduzierter Bewegung.
  useEffect(() => {
    if (card) timingFor(card.id).enterDoneAt = performance.now() + readDuration('--duration-card-enter') + readDuration('--duration-card-fade');
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Die nächsten zwei Karten vorladen, damit beim Wischen kein leeres Bild erscheint (A15).
  const upcoming = imageUrls(queue.slice(1, 3).map((entry) => presentCard(round, entry)), { style: imageStyle, filter: imageFilter });
  const upcomingKey = upcoming.join('|');
  useEffect(() => {
    if (typeof Image === 'undefined') return;
    for (const src of upcoming) {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
    }
  }, [upcomingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleKey(event) {
      const answer = KEY_TO_ANSWER[event.key];
      if (!answer || pickerOpen.current || event.altKey || event.ctrlKey || event.metaKey) return;
      if (answer === PREFER && !preferAllowed.current) return;
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

  // Bild oder Platzhalter ist sichtbar (Artwork meldet es einmal je Karte): Ab jetzt läuft die Antwortzeit.
  function handleImageStatus(status) {
    if (status.cardId !== card.id) return;
    const current = timingFor(card.id);
    if (current.readyAt !== null) return;
    current.readyAt = performance.now();
    current.image = { imageShown: status.imageShown, imageSource: status.imageSource };
  }

  // Für das Protokoll (A15): Wurde ein Bild gezeigt, und welches war vorgesehen?
  function imageInfo() {
    return timingFor(card.id).image ?? { imageShown: false, imageSource: cardVisual(card, { style: imageStyle, filter: imageFilter }).source ?? null };
  }

  // null: Antwort, bevor Bild oder Platzhalter sichtbar war (die Karte war nie vollständig sichtbar).
  function responseTime(decidedAt) {
    const current = timingFor(card.id);
    if (current.readyAt === null) return null;
    const start = Math.max(current.enterDoneAt ?? current.readyAt, current.readyAt);
    const paused = current.pauses.reduce((sum, pause) => sum + Math.max(0, Math.min(pause.to ?? decidedAt, decidedAt) - Math.max(pause.from, start)), 0);
    return Math.max(0, Math.round(decidedAt - start - paused));
  }

  function handleCommitted(answer, method, decidedAt, extra) {
    onAnswer(card, answer, method, responseTime(decidedAt), position, extra?.excludedCardIds, variant, imageInfo());
  }

  // Übersicht während des Wischens: Die Zeit für die Karte pausiert und läuft nach dem Schliessen weiter
  // (Navigation verfälscht responseTimeMs nicht). Eigenes Ereignis NAVIGATION, keine Antwort.
  function openOverview() {
    timingFor(card.id).pauses.push({ from: performance.now(), to: null });
    setOverviewOpen(true);
    onNavigate?.('overview_open');
  }

  function closeOverview() {
    const pause = timingFor(card.id).pauses.at(-1);
    if (pause && pause.to === null) pause.to = performance.now();
    setOverviewOpen(false);
    onNavigate?.('overview_close');
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
          <button type="button" className="button-ghost" onClick={() => onEndRound(imageInfo())}>
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

      <div className="round-head">
        {rounds ? (
          <button type="button" className="round-title round-title-button" aria-haspopup="dialog" onClick={openOverview}>
            <span>{ROUND.roundOf(round.round, MAX_ROUNDS, ROUND.roundNames[round.round], ROUND.roundHints[round.round])}</span>
            <ListChecks aria-label={ROUNDS.openOverview} />
          </button>
        ) : (
          <p className="round-title">{ROUND.roundOf(round.round, MAX_ROUNDS, ROUND.roundNames[round.round], ROUND.roundHints[round.round])}</p>
        )}
      </div>

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
          variant={variant}
          onImageStatus={handleImageStatus}
          onCommitted={handleCommitted}
          onIntent={(next) => setIntentFor({ cardId: card.id, intent: next })}
        />
      </div>

      <AnswerButtons variant={variant} intent={intent} onAnswer={(answer) => cardRef.current?.commit(answer, 'button')} onIntolerant={handleIntolerant} />

      {dishRound && Boolean(card) && (
        <div className="round-exit">
          <button type="button" className="button-secondary" onClick={() => onEndRound(imageInfo())}>
            <X aria-hidden="true" />
            {ROUND.endRound}
          </button>
        </div>
      )}

      {overviewOpen && rounds && (
        <Sheet title={ROUNDS.title} intro={ROUNDS.sheetIntro} onClose={closeOverview}>
          <div className="sheet-body">
            <RoundOverview rounds={rounds} current={round.round} />
          </div>
          <div className="sheet-actions is-stacked">
            <button type="button" className="button-primary" onClick={closeOverview}>
              {ROUNDS.backToCard}
            </button>
          </div>
        </Sheet>
      )}

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
