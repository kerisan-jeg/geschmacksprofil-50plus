import { useContext, useState } from 'react';
import { Utensils } from 'lucide-react';
import { allowedPhotos, assetUrl, illustrationForCard, ImageFilterContext, ImageStyleContext, photosForCard, photoSources } from '../lib/images.js';

// Bild einer Karte. Zustände (data-state):
//   loading – Fotos laden, der Platzhalter pulsiert ruhig
//   loaded  – Fotos sichtbar
//   missing – kein Foto hinterlegt oder Bildstil 'illustration': eigene Illustration auf der Kartenfarbe
//   error   – ein Foto lädt nicht: derselbe Platzhalter, nie ein kaputtes Bild
// Gruppen zeigen ihre drei Beispiele als Bildraster: das erste gross links, die anderen rechts.
// Fotos von Ausgeschlossenem fallen weg: dann zwei Felder, ein Foto oder ein sicherer Platzhalter.
// Die Bilder ergänzen Titel und Beispiele, die als Text danebenstehen: alt bleibt leer.
const SIZES = {
  card: '(max-width: 30rem) 100vw, 30rem',
  thumb: '8rem',
};
const COLLAGE_SIZES = {
  card: '(max-width: 30rem) 55vw, 17rem',
  thumb: '4rem',
};

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

export default function Artwork({ card, size = 'card', className = '' }) {
  const filter = useContext(ImageFilterContext);
  const style = useContext(ImageStyleContext);
  const neutral = card.stage === 1;
  const photos = neutral ? [] : allowedPhotos(photosForCard(card.id, style), filter);
  const illustration = neutral ? null : illustrationForCard(card, filter);
  const collage = photos.length > 1;
  // Ladezustand je Bildquelle, damit neue Fotos nie den Zustand der alten erben.
  const [status, setStatus] = useState({});
  const sources = photos.map((photo) => ({ ...photoSources(photo), photo }));
  const states = sources.map((source) => status[source.src]);
  let state = 'missing';
  if (sources.length > 0) {
    if (states.includes('error')) state = 'error';
    else state = states.every((value) => value === 'loaded') ? 'loaded' : 'loading';
  }

  function mark(src, value) {
    setStatus((current) => (current[src] === value ? current : { ...current, [src]: value }));
  }

  return (
    <div
      className={`artwork${collage ? ' is-collage' : ''} ${className}`.trim()}
      data-state={state}
      data-count={collage ? photos.length : undefined}
      style={{ '--tint': card.tint }}
    >
      <div className="artwork-placeholder" aria-hidden="true">
        {neutral && <NeutralPlate />}
        {!neutral && illustration && <img className="artwork-illustration" src={assetUrl(`illustrations/${illustration}`)} alt="" draggable={false} />}
        {!neutral && !illustration && <Utensils className="artwork-fallback-icon" />}
      </div>
      {sources.length > 0 && state !== 'error' && (
        <div className="artwork-photos">
          {sources.map(({ src, srcSet, photo }) => (
            <img
              key={src}
              className="artwork-photo"
              src={src}
              srcSet={srcSet}
              sizes={(collage ? COLLAGE_SIZES : SIZES)[size]}
              alt=""
              draggable={false}
              decoding="async"
              loading={size === 'thumb' ? 'lazy' : 'eager'}
              style={{
                '--focus-x': `${Math.round((photo.focusX ?? 0.5) * 100)}%`,
                '--focus-y': `${Math.round((photo.focusY ?? 0.5) * 100)}%`,
              }}
              ref={(node) => {
                // Bereits im Cache: load-Ereignis kann vor React kommen.
                if (node?.complete && node.naturalWidth > 0 && status[src] !== 'loaded') mark(src, 'loaded');
              }}
              onLoad={() => mark(src, 'loaded')}
              onError={() => mark(src, 'error')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
