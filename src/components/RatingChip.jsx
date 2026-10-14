import { ANSWER_META } from './answerMeta.js';

// Bewertung als Chip: Farbe UND Symbol UND Text (nie nur Farbe, Rot-Grün-Schwäche).
export default function RatingChip({ answer }) {
  const meta = ANSWER_META[answer];
  if (!meta) return null;
  return (
    <span className={`rating-chip tone-${meta.tone}`}>
      <meta.Icon aria-hidden="true" />
      {meta.label}
    </span>
  );
}
