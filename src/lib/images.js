// Fotos der Karten und ihre Nachweise (src/data/image-credits.json).
// Fehlt ein Foto oder lädt es nicht, zeigt Artwork.jsx den gestalteten Platzhalter
// (eigene Illustration aus public/illustrations auf der Kartenfarbe), nie ein kaputtes Bild.

import { createContext } from 'react';
import credits from '../data/image-credits.json';
import { IMAGE_STYLE } from '../config.js';

// Bildstil der Karten ('photo' oder 'illustration', siehe IMAGE_STYLE in config.js).
// App.jsx setzt den Wert der Sitzung; Artwork.jsx liest ihn.
export const ImageStyleContext = createContext(IMAGE_STYLE);

const BY_CARD = new Map((credits.photos ?? []).map((photo) => [photo.cardId, photo]));

// Pfad relativ zur Basis des Builds (vite.config.js: base './'), in Tests '/'.
export function assetUrl(path) {
  return `${import.meta.env?.BASE_URL ?? '/'}${path}`;
}

// Bei 'illustration' gibt es kein Foto: Artwork zeigt dann die eigene Illustration.
export function photoForCard(cardId, style = IMAGE_STYLE) {
  if (style === 'illustration') return null;
  return BY_CARD.get(cardId) ?? null;
}

// Zwei Grössen pro Foto: gross für die Karte, klein für Vorschaubilder.
export function photoSources(photo) {
  const large = assetUrl(`images/${photo.file}`);
  if (!photo.thumb) return { src: large, srcSet: undefined };
  return {
    src: large,
    srcSet: `${assetUrl(`images/${photo.thumb}`)} ${photo.thumbWidth}w, ${large} ${photo.width}w`,
  };
}

export function allPhotos() {
  return [...BY_CARD.values()];
}
