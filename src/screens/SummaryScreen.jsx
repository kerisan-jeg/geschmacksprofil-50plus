import { CircleHelp, Info, Lock, NotebookPen, PencilLine, ShieldCheck, Tag } from 'lucide-react';
import Artwork from '../components/Artwork.jsx';
import { ONBOARDING, SUMMARY } from '../labels.js';

// Abschluss von Stufe 0 (nurec v0.2, Kap. 2.2): verständliche Zusammenfassung vor dem ersten Swipe,
// die Person bestätigt oder korrigiert. Darunter sieht man, welche Gruppen dadurch wegfallen.
export default function SummaryScreen({ families, eligibleIds, roundSize, onboarding, firstName, onConfirm, onEdit }) {
  const inDeck = new Set(eligibleIds);
  const omitted = families.filter((card) => !inDeck.has(card.id));
  const { uncertain, avoidBrands, avoidOrigins } = onboarding;
  // Eingetippte Einträge erscheinen gesammelt unter „Deine Notizen“.
  const rules = onboarding.rules.filter((rule) => rule.kind !== 'note');
  const freeTextNotes = onboarding.freeTextNotes;
  const hasRules = rules.length > 0 || freeTextNotes.length > 0;

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

      {rules.length > 0 && (
        <ul className="rule-panel">
          {rules.map((rule) => (
            <li key={rule.id} className={`rule rule-${rule.kind}`}>
              <span className="rule-icon">
                <Lock aria-hidden="true" />
              </span>
              <span>
                <strong>{rule.text}</strong>
                <span className="rule-source">{rule.source}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {freeTextNotes.length > 0 && (
        <section className="notes-panel" aria-labelledby="notes-title">
          <h2 id="notes-title">
            <NotebookPen aria-hidden="true" />
            {SUMMARY.notesTitle}
          </h2>
          <ul className="rule-chips">
            {freeTextNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
          <p className="note">{ONBOARDING.entryEffect}</p>
        </section>
      )}

      {(avoidBrands.length > 0 || avoidOrigins.length > 0) && (
        <section className="notes-panel" aria-labelledby="brands-title">
          <h2 id="brands-title">
            <Tag aria-hidden="true" />
            {SUMMARY.brandsTitle}
          </h2>
          <ul className="rule-chips">
            {avoidBrands.length > 0 && <li>{SUMMARY.brands(avoidBrands)}</li>}
            {avoidOrigins.length > 0 && <li>{SUMMARY.origins(avoidOrigins)}</li>}
          </ul>
          <p className="notice">
            <Info aria-hidden="true" />
            {ONBOARDING.brandsNotApplied}
          </p>
        </section>
      )}

      {uncertain && (
        <p className="notice">
          <CircleHelp aria-hidden="true" />
          {ONBOARDING.unsureHint}
        </p>
      )}

      <button type="button" className="button-secondary" onClick={onEdit}>
        <PencilLine aria-hidden="true" />
        Angaben ändern
      </button>

      <section className="deck-preview" aria-labelledby="deck-title">
        <h2 id="deck-title">Deine erste Runde: {roundSize} Karten</h2>
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
