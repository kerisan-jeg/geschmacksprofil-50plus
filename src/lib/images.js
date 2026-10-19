// Fotos der Karten und ihre Nachweise (src/data/image-credits.json).
// Untergruppen (Stufe 2) zeigen ein Foto. Gruppen (Stufe 1) zeigen ihre drei Beispiele als Bildraster
// (collages), z. B. „Fleisch und Geflügel“ mit Poulet, Rind und Schwein, damit das Bild zur ganzen
// Gruppe passt und nicht nur zu einem Beispiel. Konkrete Lebensmittel (Stufe 3) nutzen ein vorhandenes Foto,
// wenn es genau dieses Lebensmittel zeigt (cardPhotos, z. B. „Lachs“); sonst die Illustration ihrer Gruppe.
// Fehlt ein Foto oder lädt es nicht, zeigt Artwork.jsx den gestalteten Platzhalter
// (eigene Illustration aus public/illustrations auf der Kartenfarbe), nie ein kaputtes Bild.

import { createContext } from 'react';
import credits from '../data/image-credits.json';
import { IMAGE_STYLE } from '../config.js';
import { annotateCard, displayCardTitle, foodMatches, isVisible } from '../logic/filter.js';

// Bildstil der Karten ('photo' oder 'illustration', siehe IMAGE_STYLE in config.js).
// App.jsx setzt den Wert der Sitzung; Artwork.jsx liest ihn.
export const ImageStyleContext = createContext(IMAGE_STYLE);

// Ausschlüsse der Person für die Bilder ({ index, exclusions }); App.jsx setzt sie, ohne Wert wird nichts gefiltert.
export const ImageFilterContext = createContext(null);

const PHOTOS = credits.photos ?? [];
const COLLAGES = credits.collages ?? {};
const BY_KEY = new Map(PHOTOS.map((photo) => [photo.key, photo]));
const BY_CARD = new Map(PHOTOS.filter((photo) => photo.cardId).map((photo) => [photo.cardId, photo]));
const CARD_PHOTOS = credits.cardPhotos ?? {};

// Pfad relativ zur Basis des Builds (vite.config.js: base './'), in Tests '/'.
export function assetUrl(path) {
  return `${import.meta.env?.BASE_URL ?? '/'}${path}`;
}

// Bilder einer Karte: ein Foto, das Bildraster einer Gruppe oder nichts (dann Illustration).
// Bei 'illustration' gibt es keine Fotos.
export function photosForCard(cardId, style = IMAGE_STYLE) {
  if (style === 'illustration') return [];
  if (COLLAGES[cardId]) return COLLAGES[cardId].map((key) => BY_KEY.get(key)).filter(Boolean);
  const photo = BY_CARD.get(cardId) ?? BY_KEY.get(CARD_PHOTOS[cardId]);
  return photo ? [photo] : [];
}

export function photoForCard(cardId, style = IMAGE_STYLE) {
  return photosForCard(cardId, style)[0] ?? null;
}

// Nur Fotos ohne Ausgeschlossenes. Jedes Foto nennt die Karten, die es zeigt (shows, so genau wie
// möglich, z. B. „Mandeln“), und die deutlich sichtbaren Lebensmittel (foods). Ist davon etwas
// ausgeschlossen (Allergie, Ernährungsweise, „Vertrage ich nicht“, eingetippte „Tomate“), fällt das
// Foto weg: Die Karte zeigt dann die übrigen Beispiele oder die Illustration, nie das Ausgeschlossene.
export function allowedPhotos(photos, filter) {
  if (!filter?.exclusions) return photos;
  const { index, exclusions } = filter;
  const foods = exclusions.foods ?? [];
  return photos.filter(
    (photo) =>
      (photo.shows ?? []).every((id) => {
        const card = index.get(id);
        return !card || isVisible(card, index, exclusions);
      }) && !(photo.foods ?? []).some((word) => foods.some((food) => foodMatches(word, food)))
  );
}

// Geerbte Illustrationen können ausgeschlossene Geschwister zeigen (F02.svg: Fisch und Garnele).
// Bei Einschränkungen der dargestellten Gruppe ersetzt ein neutrales Symbol die Illustration,
// auch während ein Foto lädt oder nach einem Ladefehler.
export function illustrationForCard(card, filter) {
  if (!card.illustration || !filter?.exclusions) return card.illustration ?? null;
  const { index, exclusions } = filter;
  let owner = index.get(card.id) ?? card;
  let parent = index.get(owner.parentId);
  while (parent && parent.illustration === card.illustration) {
    owner = parent;
    parent = index.get(owner.parentId);
  }
  const unchanged = displayCardTitle(owner, index, exclusions) === owner.title;
  return isVisible(owner, index, exclusions) && unchanged && !(annotateCard(owner, index, exclusions).notes?.length) ? card.illustration : null;
}

// Zwei Grössen pro Foto: gross für die Karte, klein für Vorschaubilder und Bildraster.
export function photoSources(photo) {
  const large = assetUrl(`images/${photo.file}`);
  if (!photo.thumb) return { src: large, srcSet: undefined };
  return {
    src: large,
    srcSet: `${assetUrl(`images/${photo.thumb}`)} ${photo.thumbWidth}w, ${large} ${photo.width}w`,
  };
}

// Alle Fotos mit den Karten, auf denen sie erscheinen (für die Bildnachweise).
export function allPhotos() {
  return PHOTOS.map((photo) => ({
    ...photo,
    usedBy: [
      ...(photo.cardId ? [photo.cardId] : []),
      ...Object.entries(COLLAGES)
        .filter(([, keys]) => keys.includes(photo.key))
        .map(([cardId]) => cardId),
      ...Object.entries(CARD_PHOTOS)
        .filter(([, key]) => key === photo.key)
        .map(([cardId]) => cardId),
    ],
  }));
}
