import Artwork from './Artwork.jsx';

// Das Aussehen einer Karte. Wird für die Swipe-Karte, die Startseite und die Erklärung genutzt.
export default function CardFace({ card, compact = false, children }) {
  return (
    <div className={`card-face${compact ? ' is-compact' : ''}`}>
      <div className="card-art">
        <Artwork card={card} />
        {!compact && <span className="card-kind">Lebensmittelgruppe</span>}
        {children}
      </div>
      <div className="card-body">
        <h2 className="card-title">{card.title}</h2>
        {!compact && (
          <p className="card-examples">
            <span className="card-examples-label">Zum Beispiel</span> {card.examples.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
