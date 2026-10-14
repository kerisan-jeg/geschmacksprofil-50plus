import { useContext, useState } from 'react';
import { Utensils } from 'lucide-react';
import { allowedPhotos, assetUrl, ImageFilterContext, ImageStyleContext, photosForCard, photoSources } from '../lib/images.js';

// Bild einer Karte. Zustände (data-state):
//   loading – Fotos laden, der Platzhalter pulsiert ruhig
//   loaded  – Fotos sichtbar
//   missing – kein Foto hinterlegt oder Bildstil 'illustration': eigene Illustration auf der Kartenfarbe
//   error   – ein Foto lädt nicht: derselbe Platzhalter, nie ein kaputtes Bild
// Gruppen zeigen ihre drei Beispiele als Bildraster: das erste gross links, die anderen rechts.
// Fotos von Ausgeschlossenem fallen weg (allowedPhotos): dann zwei Felder, ein Foto oder die Illustration.
// Die Bilder ergänzen Titel und Beispiele, die als Text danebenstehen: alt bleibt leer.
const SIZES = {
  card: '(max-width: 30rem) 100vw, 30rem',
  thumb: '8rem',
};
const COLLAGE_SIZES = {
  card: '(max-width: 30rem) 55vw, 17rem',
  thumb: '4rem',
};

export default function Artwork({ card, size = 'card', className = '' }) {
  const photos = allowedPhotos(photosForCard(card.id, useContext(ImageStyleContext)), useContext(ImageFilterContext));
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
        {card.illustration ? (
          <img className="artwork-illustration" src={assetUrl(`illustrations/${card.illustration}`)} alt="" draggable={false} />
        ) : (
          <Utensils className="artwork-fallback-icon" />
        )}
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
