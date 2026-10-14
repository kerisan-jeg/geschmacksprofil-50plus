import { Hand, Leaf, ListChecks, TriangleAlert, UserRound } from 'lucide-react';
import catalog from '../data/catalog.json';
import CardFace from '../components/CardFace.jsx';
import { APP, START } from '../labels.js';

const HERO_IDS = ['F06', 'F12', 'F03'];
const STEP_ICONS = [UserRound, ListChecks, Hand];

export default function StartScreen({ onStart, storageAvailable = true }) {
  const heroCards = HERO_IDS.map((id) => catalog.cards.find((card) => card.id === id));

  return (
    <main className="screen screen-start">
      <p className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Leaf />
        </span>
        {APP.name}
      </p>

      <div className="hero-fan" aria-hidden="true">
        {heroCards.map((card, index) => (
          <div key={card.id} className={`hero-card hero-card-${index}`}>
            <CardFace card={card} compact />
          </div>
        ))}
      </div>

      <div className="stack">
        <h1>{START.title}</h1>
        <p className="lead">{START.lead}</p>
      </div>

      <div className="stack-tight">
        <ol className="start-steps">
          {START.steps.map((text, index) => {
            const Icon = STEP_ICONS[index];
            return (
              <li key={text}>
                <span className="start-step-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>{text}</span>
              </li>
            );
          })}
        </ol>
        <p className="note">{START.pause}</p>
      </div>

      {!storageAvailable && (
        <p className="notice notice-warn" role="status">
          <TriangleAlert aria-hidden="true" />
          {START.storageBlocked}
        </p>
      )}

      <div className="action-bar">
        <button type="button" className="button-primary" onClick={onStart}>
          {START.start}
        </button>
        <p className="fineprint">{START.fineprint}</p>
      </div>
    </main>
  );
}
