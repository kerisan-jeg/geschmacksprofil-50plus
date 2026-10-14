import { useId } from 'react';
import { Check, Search } from 'lucide-react';
import { ONBOARDING } from '../labels.js';

// Suchfeld mit Vorschlägen als grosse Tippflächen (keine winzige Dropdown-Liste).
// results: [{ key, label, detail?, matchedTerm?, selected? }]
// Unter den Vorschlägen kann die aufrufende Komponente eigenen Inhalt zeigen (children),
// z. B. „Als Notiz hinzufügen“.
export default function SearchField({ label, placeholder, query, onQuery, results, onPick, onSubmitText, children }) {
  const inputId = useId();
  const listId = useId();
  const hasQuery = query.trim() !== '';

  return (
    <div className="search">
      <label htmlFor={inputId} className="search-label">{label}</label>
      <div className="search-input-wrap">
        <Search aria-hidden="true" />
        <input
          id={inputId}
          className="input search-input"
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={placeholder}
          value={query}
          aria-controls={listId}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              const exact = results.find((item) => item.rank === 0);
              if (exact) onPick(exact);
              else onSubmitText?.();
            }
          }}
        />
      </div>
      <div id={listId} aria-live="polite">
        {hasQuery && results.length > 0 && (
          <ul className="search-results">
            {results.map((item) => (
              <li key={item.key}>
                <button type="button" className={`search-hit${item.selected ? ' is-selected' : ''}`} aria-pressed={item.selected ?? false} onClick={() => onPick(item)}>
                  <span className="search-hit-text">
                    <span className="search-hit-label">{item.label}</span>
                    {(item.matchedTerm || item.detail) && (
                      <span className="search-hit-detail">
                        {[item.matchedTerm && ONBOARDING.matchedVia(item.matchedTerm), item.detail].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                  {item.selected && <Check aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        {hasQuery && children}
      </div>
    </div>
  );
}
