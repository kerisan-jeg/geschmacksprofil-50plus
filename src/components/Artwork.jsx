import { useContext, useState } from 'react';
import { Utensils } from 'lucide-react';
import { assetUrl, ImageStyleContext, photoForCard, photoSources } from '../lib/images.js';

// Bild einer Karte. Zustände (data-state):
//   loading – Foto lädt, der Platzhalter pulsiert ruhig
//   loaded  – Foto sichtbar
//   missing – kein Foto hinterlegt oder Bildstil 'illustration': eigene Illustration auf der Kartenfarbe
//   error   – Foto lädt nicht: derselbe Platzhalter, nie ein kaputtes Bild
// Das Bild ergänzt Titel und Beispiele, die als Text danebenstehen: alt bleibt leer.
const SIZES = {
  card: '(max-width: 30rem) 100vw, 30rem',
  thumb: '8rem',
};

export default function Artwork({ card, size = 'card', className = '' }) {
  const photo = photoForCard(card.id, useContext(ImageStyleContext));
  const sources = photo ? photoSources(photo) : null;
  // Ladezustand je Bildquelle, damit ein neues Foto nie den Zustand des alten erbt.
  const [loaded, setLoaded] = useState({ src: null, state: 'loading' });
  let state = 'missing';
  if (sources) state = loaded.src === sources.src ? loaded.state : 'loading';

  const style = { '--tint': card.tint };
  if (photo) {
    style['--focus-x'] = `${Math.round((photo.focusX ?? 0.5) * 100)}%`;
    style['--focus-y'] = `${Math.round((photo.focusY ?? 0.5) * 100)}%`;
  }

  return (
    <div className={`artwork ${className}`.trim()} data-state={state} style={style}>
      <div className="artwork-placeholder" aria-hidden="true">
        {card.illustration ? (
          <img className="artwork-illustration" src={assetUrl(`illustrations/${card.illustration}`)} alt="" draggable={false} />
        ) : (
          <Utensils className="artwork-fallback-icon" />
        )}
      </div>
      {sources && state !== 'error' && (
        <img
          key={sources.src}
          className="artwork-photo"
          src={sources.src}
          srcSet={sources.srcSet}
          sizes={SIZES[size]}
          alt=""
          draggable={false}
          decoding="async"
          loading={size === 'thumb' ? 'lazy' : 'eager'}
          ref={(node) => {
            // Bereits im Cache: load-Ereignis kann vor React kommen.
            if (node?.complete && node.naturalWidth > 0 && loaded.src !== sources.src) setLoaded({ src: sources.src, state: 'loaded' });
          }}
          onLoad={() => setLoaded({ src: sources.src, state: 'loaded' })}
          onError={() => setLoaded({ src: sources.src, state: 'error' })}
        />
      )}
    </div>
  );
}
