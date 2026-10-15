import { useRef } from 'react';
import { Trash2 } from 'lucide-react';
import Sheet from './Sheet.jsx';
import { ANSWER_META } from './answerMeta.js';
import { DISLIKE, LIKE, PREFER } from '../logic/answers.js';
import { PROFILE } from '../labels.js';

const RATINGS = [DISLIKE, LIKE, PREFER];

// Bewertung eines Eintrags ändern: Segmented Control mit den drei Bewertungen (Farbe, Symbol, Text)
// und „Aus dem Profil entfernen“. Jede Änderung wird ein Ereignis RATING_CHANGED (source "profile");
// die ursprüngliche Antwort beim Wischen bleibt im Protokoll.
// Für Vermutungen der App: eigener Einleitungssatz (intro) und Hinweis (note), ohne „Entfernen“ (onRemove fehlt).
export default function RatingSheet({ card, rating, intro = PROFILE.ratingLabel, note = PROFILE.ratingNote, onChange, onRemove, onClose }) {
  const groupRef = useRef(null);

  // Pfeiltasten wie bei Radio-Knöpfen
  function handleKey(event) {
    const index = RATINGS.indexOf(rating);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = RATINGS[(index + step + RATINGS.length) % RATINGS.length];
    onChange(next);
  }

  return (
    <Sheet title={card.title} intro={intro} onClose={onClose}>
      <div className="segmented" role="radiogroup" aria-label={PROFILE.ratingLabel} ref={groupRef} onKeyDown={handleKey}>
        {RATINGS.map((answer) => {
          const { Icon, label, tone } = ANSWER_META[answer];
          const checked = rating === answer;
          return (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (!RATINGS.includes(rating) && answer === DISLIKE) ? 0 : -1}
              className={`segment-option tone-${tone}${checked ? ' is-checked' : ''}`}
              onClick={() => onChange(answer)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <p className="note">{note}</p>
      {onRemove && (
        <div className="sheet-actions is-stacked">
          <button type="button" className="button-secondary button-remove" onClick={onRemove}>
            <Trash2 aria-hidden="true" />
            {PROFILE.ratingRemove}
          </button>
        </div>
      )}
    </Sheet>
  );
}
