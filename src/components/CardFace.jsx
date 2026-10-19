import { ShieldCheck } from 'lucide-react';
import Artwork from './Artwork.jsx';
import { ROUND } from '../labels.js';

// Das Aussehen einer Karte: in der Runde, im Stapel dahinter, auf der Startseite und im Tutorial.
// Hinweise aus den Ausschlüssen (z. B. „Ohne Haselnüsse“) erscheinen oben auf dem Bild. Sonst steht dort
// die Art der Karte: „Lebensmittelgruppe“, bei Untergruppen und konkreten Lebensmitteln die Karte darüber
// (z. B. „Fleisch und Geflügel“, „Rind“), bei Gerichten (Stufe 4) „Gericht“.
// Gruppen (Stufe 1): keine Beispiele, höchstens eine kurze neutrale Umschreibung (description, vorläufig).
export default function CardFace({ card, compact = false, children }) {
  const notes = compact ? [] : card.notes ?? [];
  const group = card.stage === 1;

  return (
    <div className={`card-face${compact ? ' is-compact' : ''}${group ? ' is-group' : ''}`}>
      <div className="card-art">
        <Artwork card={card} size={compact ? 'thumb' : 'card'} />
        {!compact && notes.length === 0 && <span className="card-kind">{card.dish ? ROUND.dishKind : card.group ?? ROUND.cardKind}</span>}
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
        {!compact && group && card.description && <p className="card-description">{card.description}</p>}
        {!compact && !group && card.examples.length > 0 && (
          <p className="card-examples">
            <span className="card-examples-label">{ROUND.examplesLabel}</span> {card.examples.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
