// Bilder der Karten (Addendum A15, 21.10.2026): ein Bild je Karte aus public/cards/{cardId}.webp.
// Der Eintrag image steht im Katalog: { src, alt, source: 'ai-gemini' | 'stock' | 'own', license?, credit?, shows?, foods? }.
//   credit       Bildnachweis in src/data/image-credits.json (Unsplash-Fotos)
//   shows/foods  was im Bild zu sehen ist (Karten-IDs und Lebensmittelwörter), für den Ausschluss-Filter
// Gruppen (Stufe 1) zeigen seit dem 21.10.2026 wieder ein Bild aus drei Beispielfotos (GROUP_IMAGES in config.js);
// mit GROUP_IMAGES = false auf allen Karten dasselbe neutrale Symbol (Teamentscheid 20.10.2026, Verbesserung 4).
// Fehlt ein Bild, zeigt es Ausgeschlossenes oder lädt es nicht, zeigt Artwork.jsx den neutralen Platzhalter
// (Kartenfarbe und Kartenname), nie ein kaputtes Bild. Bilder für die Karten bereitet scripts/prepare-card-images.py vor.

import { createContext } from 'react';
import credits from '../data/image-credits.json';
import { GROUP_IMAGES, IMAGE_STYLE } from '../config.js';
import { annotateCard, displayCardTitle, foodMatches, isVisible } from '../logic/filter.js';

// Bildstil der Karten ('photo' oder 'illustration', siehe IMAGE_STYLE in config.js).
// App.jsx setzt den Wert der Sitzung; Artwork.jsx liest ihn.
export const ImageStyleContext = createContext(IMAGE_STYLE);

// Ausschlüsse der Person für die Bilder ({ index, exclusions }); App.jsx setzt sie, ohne Wert wird nichts gefiltert.
export const ImageFilterContext = createContext(null);

export { IMAGE_SOURCES } from '../logic/catalog.js';

const PHOTOS = credits.photos ?? [];

// Pfad relativ zur Basis des Builds (vite.config.js: base './'), in Tests '/'.
export function assetUrl(path) {
  return `${import.meta.env?.BASE_URL ?? '/'}${path}`;
}

// Darf das Bild gezeigt werden? Nein, wenn es eine ausgeschlossene Karte oder ein ausgeschlossenes Lebensmittel zeigt
// (Allergie, Ernährungsform, „Vertrage ich nicht“, eingetippte „Tomate“). Ohne Filter (z. B. Vorschau) immer.
export function isImageAllowed(image, filter) {
  if (!filter?.exclusions) return true;
  const { index, exclusions } = filter;
  const foods = exclusions.foods ?? [];
  return (
    (image.shows ?? []).every((id) => {
      const card = index.get(id);
      return !card || isVisible(card, index, exclusions);
    }) && !(image.foods ?? []).some((word) => foods.some((food) => foodMatches(word, food)))
  );
}

// Geerbte Illustrationen können ausgeschlossene Geschwister zeigen (F02.svg: Fisch und Garnele).
// Bei Einschränkungen der dargestellten Gruppe gibt es keine Illustration (dann der Platzhalter).
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

// Was die Karte oben zeigt (A15). source steht für das Protokoll (imageSource):
//   neutral       Gruppen ohne Gruppenbild (GROUP_IMAGES = false): neutrales Symbol (eigene Grafik, source 'own')
//   illustration  Bildstil 'illustration' (Pilotvergleich, Annahme 5): eigene Illustration (source 'own')
//   image         Bild der Karte (source aus dem Katalog)
//   collage       Gruppenbild, von dem Teile Ausgeschlossenes zeigen: nur die erlaubten Teilbilder (image.parts)
//   placeholder   kein Bild (source null) oder Bild mit Ausgeschlossenem (source des nicht gezeigten Bildes)
export function cardVisual(card, { style = IMAGE_STYLE, filter = null, groupImages = GROUP_IMAGES } = {}) {
  if (card.stage === 1 && (!groupImages || !card.image)) return { kind: 'neutral', source: 'own' };
  if (style === 'illustration') {
    const illustration = illustrationForCard(card, filter);
    return illustration ? { kind: 'illustration', src: assetUrl(`illustrations/${illustration}`), source: 'own' } : { kind: 'placeholder', source: null };
  }
  const image = card.image;
  if (!image?.src) return { kind: 'placeholder', source: null };
  if (!isImageAllowed(image, filter)) {
    // Gruppenbild: aus den erlaubten Teilen zusammensetzen (z. B. ohne Schweinefleisch nur Poulet und Rind)
    const parts = (image.parts ?? []).filter((part) => isImageAllowed(part, filter));
    if (parts.length > 0) {
      return {
        kind: 'collage',
        parts: parts.map((part) => ({ src: assetUrl(part.src), alt: part.alt ?? '' })),
        alt: parts.map((part) => part.alt).join(', '),
        source: image.source ?? null,
      };
    }
    return { kind: 'placeholder', source: image.source ?? null };
  }
  return { kind: 'image', src: assetUrl(image.src), alt: image.alt ?? '', source: image.source ?? null };
}

// Bilder, die vorgeladen werden sollen (die nächsten Karten), ohne Doppelte.
export function imageUrls(cards, options) {
  const urls = cards.map((card) => cardVisual(card, options)).flatMap((visual) => {
    if (visual.kind === 'image') return [visual.src];
    if (visual.kind === 'collage') return visual.parts.map((part) => part.src);
    return [];
  });
  return [...new Set(urls)];
}

// Unsplash-Fotos mit den Karten, auf denen sie erscheinen (für die Bildnachweise). Nur Fotos, die eine Karte zeigt.
// Gruppenbilder nennen ihre drei Fotos als Liste (credit: [Schlüssel]).
export function allPhotos(cards = []) {
  const credits = (card) => [].concat(card.image?.credit ?? []);
  return PHOTOS.map((photo) => ({
    ...photo,
    usedBy: cards.filter((card) => credits(card).includes(photo.key)).map((card) => card.id),
  })).filter((photo) => photo.usedBy.length > 0);
}
