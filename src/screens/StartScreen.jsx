import { Hand, Leaf, Pause, UserRound } from 'lucide-react';
import catalog from '../data/catalog.json';
import CardFace from '../components/CardFace.jsx';

const HERO_IDS = ['F06', 'F12', 'F03'];

export default function StartScreen({ onStart }) {
  const heroCards = HERO_IDS.map((id) => catalog.cards.find((card) => card.id === id));

  return (
    <main className="screen screen-start">
      <p className="brand">
        <span className="brand-mark" aria-hidden="true"><Leaf strokeWidth={2.2} /></span>
        Geschmacksprofil
      </p>

      <div className="hero-fan" aria-hidden="true">
        {heroCards.map((card, index) => (
          <div key={card.id} className={`hero-card hero-card-${index}`}>
            <CardFace card={card} compact />
          </div>
        ))}
      </div>

      <h1>Was isst du gern?</h1>
      <p className="lead">
        Wir zeigen dir Lebensmittel auf Karten. Bei jeder Karte sagst du mit einem Wisch oder einem Tipp, wie gern du sie isst.
      </p>

      <ul className="facts">
        <li><UserRound aria-hidden="true" />Kurz anmelden und drei Fragen beantworten</li>
        <li><Hand aria-hidden="true" />Dann Karten wischen oder tippen</li>
        <li><Pause aria-hidden="true" />Du kannst jederzeit aufhören</li>
      </ul>

      <div className="screen-actions">
        <button type="button" className="button-primary" onClick={onStart}>Los geht’s</button>
        <p className="fineprint">
          Prototyp aus einem Studierendenprojekt der ZHAW für nurec. Deine Antworten bleiben auf diesem Gerät.
        </p>
      </div>
    </main>
  );
}
