import { useId, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { highlightParts, searchFoods } from '../logic/foodSearch.js';
import { cleanText } from '../logic/stage0.js';
import { ONBOARDING, SEARCH } from '../labels.js';

const MAX_HITS = 6;

function Highlighted({ text, query }) {
  return highlightParts(text, query).map((part, index) => (part.match ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>));
}

function categoryOf(hit) {
  if (hit.category) return hit.category;
  if (hit.kind === 'card') return SEARCH.family;
  if (hit.kind === 'tag') return SEARCH.tag;
  if (hit.kind === 'allergen') return SEARCH.allergen;
  return null;
}

// Einheitliches Autocomplete für Lebensmittel (A7): dieselbe Komponente für Allergien und
// Unverträglichkeiten (Frage 2), „Nie vorschlagen“ (Frage 3) und „Mein Profil“.
// - Vorschläge ab dem ersten Zeichen, höchstens 6, als grosse Tippflächen (≥ 48 px)
// - der passende Teil ist hervorgehoben, die Gruppe steht als Zusatz („Haselnuss · Nüsse“)
// - Synonyme werden genannt („passt zu „Sahne““)
// - alle Zutaten und Getränke der Schweizer Nährwertdatenbank sind wählbar, auch in der Mehrzahl („Oliven“)
// - Tippfehler: „Meintest du:“ mit ähnlichen Einträgen
// - nur wenn wirklich nichts passt, lässt sich der Text als Notiz eintragen (seltene Ausnahme);
//   sie schliesst keine Gruppe aus (ehrlicher Hinweis)
//
// items: Suchindex aus buildFoodIndex(). isSelected(hit), isOffered(hit): Auswahl und „schon ausgeschlossen“.
export default function FoodSearch({ label, placeholder, items, isSelected = () => false, isOffered = () => true, onPick, onAddNote, autoFocus = false }) {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const listId = useId();
  const text = cleanText(query);
  const hits = text ? searchFoods(items, text, { limit: items.length }) : [];
  const offered = hits.filter((hit) => isSelected(hit) || isOffered(hit)).slice(0, MAX_HITS);
  const alreadyCovered = hits.length > 0 && offered.length === 0;
  const similarOnly = offered.length > 0 && offered.every((hit) => hit.fuzzy);
  const canAddNote = Boolean(onAddNote) && text && !alreadyCovered && (offered.length === 0 || similarOnly);

  function pick(hit) {
    onPick(hit);
    setQuery('');
  }

  function addNote() {
    if (!text) return;
    onAddNote(text);
    setQuery('');
  }

  return (
    <div className="search">
      <label htmlFor={inputId} className="search-label">
        {label}
      </label>
      <div className="search-input-wrap">
        <Search aria-hidden="true" />
        <input
          id={inputId}
          className="input search-input"
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={query}
          aria-controls={listId}
          aria-describedby={`${listId}-status`}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            const best = offered.find((hit) => hit.rank === 0);
            if (best) pick(best);
            else if (canAddNote && offered.length === 0) addNote();
          }}
        />
      </div>
      <p id={`${listId}-status`} className="sr-only" aria-live="polite">
        {text ? SEARCH.results(offered.length) : ''}
      </p>
      <div id={listId}>
        {similarOnly && <p className="note search-hint">{SEARCH.didYouMean}</p>}
        {offered.length > 0 && (
          <ul className="search-results">
            {offered.map((hit) => {
              const selected = isSelected(hit);
              const category = categoryOf(hit);
              return (
                <li key={hit.key}>
                  <button type="button" className={`search-hit${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => pick(hit)}>
                    <span className="search-hit-text">
                      <span className="search-hit-label">
                        {hit.matchedTerm ? hit.label : <Highlighted text={hit.label} query={text} />}
                      </span>
                      {category && <span className="search-hit-category">{` · ${category}`}</span>}
                      {hit.matchedTerm && (
                        <span className="search-hit-detail">
                          {SEARCH.matchedViaStart}
                          <Highlighted text={hit.matchedTerm} query={text} />
                          {SEARCH.matchedViaEnd}
                        </span>
                      )}
                    </span>
                    {selected && <Check aria-hidden="true" />}
                    {selected && <span className="sr-only">{SEARCH.selected}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {text && offered.length === 0 && !alreadyCovered && <p className="note">{SEARCH.noResult}</p>}
        {alreadyCovered && <p className="note">{ONBOARDING.alreadyCovered}</p>}
        {canAddNote && (
          <div className="search-empty">
            <button type="button" className="button-ghost is-strong add-entry" onClick={addNote}>
              <Plus aria-hidden="true" />
              {SEARCH.addNote(text)}
            </button>
            <p className="note">{ONBOARDING.entryEffect}</p>
          </div>
        )}
      </div>
    </div>
  );
}
