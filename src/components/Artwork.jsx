import { useContext, useEffect, useRef, useState } from 'react';
import { IMAGE_LOAD_TIMEOUT_MS } from '../config.js';
import { cardVisual, ImageFilterContext, ImageStyleContext } from '../lib/images.js';

// Bild einer Karte (Addendum A15). Zustände (data-state):
//   loading – das Bild lädt, die Kartenfarbe pulsiert ruhig
//   loaded  – Bild sichtbar
//   symbol  – Gruppe: neutrales Symbol, oder Bildstil 'illustration': eigene Illustration
//   missing – kein Bild (oder eines mit Ausgeschlossenem): neutraler Platzhalter
//   error   – Bild lädt nicht: derselbe Platzhalter, nie ein kaputtes Bild
//   timeout – Bild lädt zu lange (IMAGE_LOAD_TIMEOUT_MS): Platzhalter, auch wenn es später noch käme
// Platzhalter: Kartenfarbe und Kartenname, damit die Karte voll bedienbar bleibt. Der Name steht zusätzlich als
// echter Text unter dem Bild (CardFace), im Platzhalter ist er für Screenreader verborgen.
// onStatus meldet einmal je Karte, sobald Bild oder Platzhalter sichtbar ist: { cardId, imageShown, imageSource }.
// RoundScreen misst die Antwortzeit erst ab diesem Moment (A9: Karte vollständig sichtbar).

// Gruppen (Stufe 1) zeigen kein Foto und keine Illustration, sondern auf allen Karten dasselbe neutrale Symbol:
// einen leeren Teller mit Besteck (Dozentenfeedback 19.10.2026, Verbesserung 4, Variante A). Ein Bild mit Tomaten
// auf „Gemüse“ wirkt wie ein Beispiel. Unterscheidung über Titel und Kartenfarbe (tint).
function NeutralPlate() {
  return (
    <svg className="artwork-neutral" viewBox="0 0 240 150" aria-hidden="true">
      <circle cx="120" cy="75" r="50" />
      <circle cx="120" cy="75" r="34" opacity="0.55" />
      <path d="M44 32v30a8 8 0 0 0 8 8h0a8 8 0 0 0 8-8V32 M52 32v26 M52 70v50" />
      <path d="M196 120V32c-10 6-14 18-14 30v14a6 6 0 0 0 6 6h8" />
    </svg>
  );
}

const FINAL = ['loaded', 'error', 'timeout'];

// timeoutMs: nur für Tests kürzer als IMAGE_LOAD_TIMEOUT_MS.
export default function Artwork({ card, size = 'card', className = '', onStatus, timeoutMs = IMAGE_LOAD_TIMEOUT_MS }) {
  const filter = useContext(ImageFilterContext);
  const style = useContext(ImageStyleContext);
  const visual = cardVisual(card, { style, filter });
  // Ladezustand je Bildquelle: Ein neues Bild erbt nie den Zustand des alten. Der erste Endzustand gilt.
  const [load, setLoad] = useState({ src: null, value: 'loading' });
  let state = 'symbol';
  if (visual.kind === 'placeholder') state = 'missing';
  if (visual.kind === 'image') state = load.src === visual.src ? load.value : 'loading';
  const placeholder = state === 'missing' || state === 'error' || state === 'timeout';
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  function mark(value) {
    setLoad((current) => (current.src === visual.src && FINAL.includes(current.value) ? current : { src: visual.src, value }));
  }

  // Lädt das Bild zu lange, gilt der Platzhalter (auch auf langsamen Verbindungen bleibt die Karte bedienbar).
  // Der Zeitgeber läuft je Bild einmal (nicht bei jedem neuen Zeichnen, z. B. während des Ziehens).
  useEffect(() => {
    if (state !== 'loading') return undefined;
    const timer = setTimeout(() => mark('timeout'), timeoutMs);
    return () => clearTimeout(timer);
  }, [state, visual.src, timeoutMs]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = state !== 'loading';
  const imageShown = state === 'loaded' || state === 'symbol';
  useEffect(() => {
    if (ready) statusRef.current?.({ cardId: card.id, imageShown, imageSource: visual.source ?? null });
  }, [ready, card.id, imageShown, visual.source]);

  return (
    <div className={`artwork ${className}`.trim()} data-state={state} data-kind={visual.kind} style={{ '--tint': card.tint }}>
      <div className="artwork-placeholder" aria-hidden="true">
        {visual.kind === 'neutral' && <NeutralPlate />}
        {visual.kind === 'illustration' && <img className="artwork-illustration" src={visual.src} alt="" draggable={false} />}
        {placeholder && size !== 'thumb' && <span className="artwork-name">{card.title}</span>}
      </div>
      {visual.kind === 'image' && !placeholder && (
        <img
          key={visual.src}
          className="artwork-photo"
          src={visual.src}
          alt={visual.alt}
          draggable={false}
          decoding="async"
          loading={size === 'thumb' ? 'lazy' : 'eager'}
          ref={(node) => {
            // Bereits im Cache (z. B. vorgeladen): load-Ereignis kann vor React kommen.
            if (node?.complete && node.naturalWidth > 0 && state === 'loading') mark('loaded');
          }}
          onLoad={() => mark('loaded')}
          onError={() => mark('error')}
        />
      )}
    </div>
  );
}
