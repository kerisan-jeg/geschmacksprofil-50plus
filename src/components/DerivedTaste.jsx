import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Artwork from './Artwork.jsx';
import { ANSWER_META } from './answerMeta.js';
import { DISLIKE, LIKE } from '../logic/answers.js';
import { PROFILE } from '../labels.js';

const GROUPS = [LIKE, DISLIKE];
// Lange Listen zuerst gekürzt: die stärksten Vermutungen oben, der Rest über „Alle anzeigen“.
const VISIBLE = 5;

// Vermutungen der App in „Mein Profil“ (derivedEntries in src/logic/engine.js): getrennt von den eigenen
// Bewertungen, gestrichelt umrandet und mit Begründung („Vermutet, weil du „Obst“ magst“).
// Tippen öffnet die Bewertung; die eigene Antwort ersetzt dann die Vermutung.
export default function DerivedTaste({ entries, index, titleOf = (id) => index.get(id)?.title ?? '', onSelect }) {
  const [expanded, setExpanded] = useState({});
  if (entries.length === 0) return null;

  return (
    <section className="stack" aria-labelledby="derived-title">
      <div className="stack-tight">
        <h2 id="derived-title" className="title-section">
          {PROFILE.derived.title}
        </h2>
        <p className="note">{PROFILE.derived.lead}</p>
      </div>
      {GROUPS.map((rating) => {
        const list = entries.filter((entry) => entry.rating === rating);
        if (list.length === 0) return null;
        const { Icon, tone } = ANSWER_META[rating];
        const open = Boolean(expanded[rating]);
        const listId = `derived-list-${rating}`;
        return (
          <section key={rating} className={`panel taste-group is-derived tone-${tone}`} aria-labelledby={`derived-${rating}`}>
            <h3 id={`derived-${rating}`} className="taste-group-title">
              <span className="group-icon">
                <Icon aria-hidden="true" />
              </span>
              <span>{PROFILE.derived.groups[rating]}</span>
              <span className="group-count num">{list.length}</span>
            </h3>
            <ul className="taste-list" id={listId}>
              {(open ? list : list.slice(0, VISIBLE)).map((entry) => {
                const card = index.get(entry.cardId);
                const title = titleOf(entry.cardId);
                const reason = PROFILE.derived.reason(titleOf(entry.basisId), entry.basisRating);
                return (
                  <li key={entry.cardId}>
                    <button type="button" className="taste-row" onClick={() => onSelect(entry)} aria-label={PROFILE.derived.rowLabel(title, reason)}>
                      <Artwork card={card} size="thumb" className="thumb" />
                      <span className="taste-text">
                        <span className="taste-title">{title}</span>
                        <span className="taste-reason">{reason}</span>
                      </span>
                      <ChevronRight className="row-chevron" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {list.length > VISIBLE && (
              <button
                type="button"
                className="button-ghost is-strong more-button"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setExpanded({ ...expanded, [rating]: !open })}
              >
                <ChevronDown aria-hidden="true" className={open ? 'is-flipped' : undefined} />
                {open ? PROFILE.derived.showLess : PROFILE.derived.showAll(list.length)}
              </button>
            )}
          </section>
        );
      })}
    </section>
  );
}
