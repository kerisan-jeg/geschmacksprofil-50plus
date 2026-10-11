import { ShieldCheck } from 'lucide-react';
import Artwork from './Artwork.jsx';

// Das Aussehen einer Karte. Wird für die Swipe-Karte, die Startseite und die Erklärung genutzt.
// Hinweise aus Stufe 0 (z. B. „Nur glutenfrei“) erscheinen oben auf dem Bild.
export default function CardFace({ card, compact = false, children }) {
  const notes = compact ? [] : card.notes ?? [];

  return (
    <div className={`card-face${compact ? ' is-compact' : ''}`}>
      <div className="card-art">
        <Artwork card={card} />
        {!compact && notes.length === 0 && <span className="card-kind">Lebensmittelgruppe</span>}
        {notes.length > 0 && (
          <ul className="card-notes">
            {notes.map((note) => (
              <li key={note}>
                <ShieldCheck aria-hidden="true" strokeWidth={2.4} />
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
            <span className="card-examples-label">Zum Beispiel</span> {card.examples.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
