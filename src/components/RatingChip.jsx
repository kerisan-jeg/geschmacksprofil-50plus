import { useContext } from 'react';
import { metaFor, ScaleConfigContext } from './answerMeta.js';
import { scaleVariant } from '../logic/scale.js';

// Bewertung als Chip: Farbe UND Symbol UND Text (nie nur Farbe, Rot-Grün-Schwäche).
// card: für den Begriff der Runde (Gruppen: „Eher gern“, sonst „Mag ich“).
export default function RatingChip({ answer, card = null }) {
  const meta = metaFor(answer, scaleVariant(card, useContext(ScaleConfigContext)));
  if (!meta) return null;
  return (
    <span className={`rating-chip tone-${meta.tone}`}>
      <meta.Icon aria-hidden="true" />
      {meta.label}
    </span>
  );
}
