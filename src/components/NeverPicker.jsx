import { useState } from 'react';
import { CircleAlert, NotebookPen } from 'lucide-react';
import SearchField from './SearchField.jsx';
import SelectionChips from './SelectionChips.jsx';
import { neverLabel, searchNever } from '../logic/stage0.js';
import { ONBOARDING } from '../labels.js';

// Frage 3 „Nie vorschlagen“ (A7):
// - wenige häufige Beispiele als Chips, jedes auf eine Katalog-ID oder einen Tag abgebildet
// - Suche über Karten und Familien
// - ohne Treffer: „Als Notiz hinzufügen“. Notizen filtern nichts, und das steht ehrlich daneben.
export default function NeverPicker({ question, catalogIndex, answer, onChange }) {
  const [query, setQuery] = useState('');
  const { selected, notes } = answer;

  function toggleKey(key) {
    const next = selected.includes(key) ? selected.filter((entry) => entry !== key) : [...selected, key];
    onChange({ ...answer, selected: next });
  }

  function addNote(text) {
    const clean = text.trim().slice(0, 60);
    if (clean && !notes.includes(clean)) onChange({ ...answer, notes: [...notes, clean] });
    setQuery('');
  }

  const results = searchNever(question, catalogIndex, query).map((hit) => ({ ...hit, selected: selected.includes(hit.key) }));
  const chips = [
    ...selected.map((key) => ({ key, text: neverLabel(question, catalogIndex, key) })),
    ...notes.map((note) => ({ key: `note:${note}`, text: note, tag: ONBOARDING.noteChip, note })),
  ];

  return (
    <div className="never-picker">
      <section aria-labelledby="quick-picks">
        <h3 id="quick-picks" className="chips-title">{ONBOARDING.quickPicksTitle}</h3>
        <div className="quick-picks">
          {question.quickPicks.map((pick) => {
            const on = selected.includes(pick.key);
            return (
              <button key={pick.key} type="button" className={`pick${on ? ' is-checked' : ''}`} aria-pressed={on} onClick={() => toggleKey(pick.key)}>
                {pick.label}
              </button>
            );
          })}
        </div>
      </section>

      <SearchField
        label={ONBOARDING.searchNeverLabel}
        placeholder={ONBOARDING.searchNeverPlaceholder}
        query={query}
        onQuery={setQuery}
        results={results}
        onPick={(hit) => {
          toggleKey(hit.key);
          setQuery('');
        }}
      >
        {results.length === 0 && (
          <div className="note-offer">
            <button type="button" className="button-secondary" onClick={() => addNote(query)}>
              <NotebookPen aria-hidden="true" />
              {ONBOARDING.addNote(query.trim())}
            </button>
            <p className="note">{ONBOARDING.noteNotApplied}</p>
          </div>
        )}
      </SearchField>

      <SelectionChips
        chips={chips}
        onRemove={(chip) =>
          chip.note ? onChange({ ...answer, notes: notes.filter((note) => note !== chip.note) }) : toggleKey(chip.key)
        }
      />

      {notes.length > 0 && (
        <p className="notice notice-warn">
          <CircleAlert aria-hidden="true" />
          {ONBOARDING.noteNotApplied}
        </p>
      )}
    </div>
  );
}
