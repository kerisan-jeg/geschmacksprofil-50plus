import { CircleHelp, Lock, PencilLine, ShieldCheck } from 'lucide-react';
import Artwork from '../components/Artwork.jsx';

// Abschluss von Stufe 0 (nurec v0.2, Kap. 2.2): verständliche Zusammenfassung vor dem ersten Swipe,
// die Person bestätigt oder korrigiert. Darunter sieht man, welche Gruppen dadurch wegfallen.
export default function SummaryScreen({ families, rules, round, unsureTexts, firstName, onConfirm, onEdit }) {
  const inDeck = new Set(round.cards.map((card) => card.id));
  const omitted = families.filter((card) => !inDeck.has(card.id));
  const hasRules = rules.rules.length > 0;

  return (
    <main className="screen screen-summary">
      <p className="kicker">
        <ShieldCheck aria-hidden="true" />
        {firstName ? `Danke, ${firstName}` : 'Fragen beantwortet'}
      </p>
      <h1>{hasRules ? 'Deine festen Regeln' : 'Keine Ausschlüsse'}</h1>
      <p className="lead">
        {hasRules
          ? 'Das schlagen wir dir nie vor, egal wie du später wischst. Stimmt das so?'
          : 'Du hast nichts angegeben, das wir weglassen müssen.'}
      </p>

      {hasRules && (
        <ul className="rule-panel">
          {rules.rules.map((rule) => (
            <li key={rule.id} className={`rule rule-${rule.kind}`}>
              <span className="rule-icon">
                {rule.kind === 'constraint' ? <ShieldCheck aria-hidden="true" /> : <Lock aria-hidden="true" />}
              </span>
              <span>
                <strong>{rule.text}</strong>
                <span className="rule-source">{rule.source}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {unsureTexts.map((text) => (
        <p key={text} className="notice">
          <CircleHelp aria-hidden="true" />
          {text}
        </p>
      ))}

      <button type="button" className="button-secondary" onClick={onEdit}>
        <PencilLine aria-hidden="true" />
        Angaben ändern
      </button>

      <section className="deck-preview" aria-labelledby="deck-title">
        <h2 id="deck-title">Deine erste Runde: {round.cards.length} Karten</h2>
        <p className="note">
          {omitted.length > 0
            ? `Weggelassen: ${omitted.map((card) => card.title).join(', ')}.`
            : 'Alle Lebensmittelgruppen sind dabei.'}
        </p>
        <ul className="deck-thumbs">
          {families.map((card) => {
            const out = !inDeck.has(card.id);
            return (
              <li key={card.id} className={out ? 'is-out' : undefined} title={card.title}>
                <Artwork card={card} />
                {out && (
                  <span className="thumb-lock">
                    <Lock aria-hidden="true" />
                  </span>
                )}
                <span className="sr-only">
                  {card.title}
                  {out ? ' (weggelassen)' : ''}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sticky-actions">
        <button type="button" className="button-primary" onClick={onConfirm}>
          {hasRules ? 'Stimmt so, weiter' : 'Weiter'}
        </button>
      </div>
    </main>
  );
}
