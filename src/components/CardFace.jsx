import { ShieldCheck } from 'lucide-react';
import Artwork from './Artwork.jsx';
import { ROUND } from '../labels.js';

// Das Aussehen einer Karte: in der Runde, im Stapel dahinter, auf der Startseite und im Tutorial.
// Hinweise aus den Ausschlüssen (z. B. „Ohne Haselnüsse“) erscheinen oben auf dem Bild.
export default function CardFace({ card, compact = false, children }) {
  const notes = compact ? [] : card.notes ?? [];

  return (
    <div className={`card-face${compact ? ' is-compact' : ''}`}>
      <div className="card-art">
        <Artwork card={card} size={compact ? 'thumb' : 'card'} />
        {!compact && notes.length === 0 && <span className="card-kind">{ROUND.cardKind}</span>}
        {notes.length > 0 && (
          <ul className="card-notes">
            {notes.map((note) => (
              <li key={note}>
                <ShieldCheck aria-hidden="true" />
                {note}
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
      <div className="card-body">
        <h2 className="card-title">{card.title}</h2>
        {!compact && card.examples.length > 0 && (
          <p className="card-examples">
            <span className="card-examples-label">{ROUND.examplesLabel}</span> {card.examples.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
