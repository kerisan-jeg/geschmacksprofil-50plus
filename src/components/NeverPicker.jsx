import { useId, useState } from 'react';
import { Info, Plus } from 'lucide-react';
import SearchField from './SearchField.jsx';
import SelectionChips from './SelectionChips.jsx';
import { cleanText, keyLabel, searchNever } from '../logic/stage0.js';
import { ONBOARDING } from '../labels.js';

// Freitext-Liste als Chips, z. B. für Marken oder Herkunft.
function TextList({ title, hint, placeholder, values, onChange }) {
  const [text, setText] = useState('');
  const inputId = useId();
  const value = cleanText(text);

  function add() {
    if (value && !values.some((entry) => entry.toLowerCase() === value.toLowerCase())) onChange([...values, value]);
    setText('');
  }

  return (
    <div className="text-list">
      <label htmlFor={inputId} className="search-label">{title}</label>
      {hint && <p className="note">{hint}</p>}
      <div className="text-list-row">
        <input
          id={inputId}
          className="input"
          type="text"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={60}
          placeholder={placeholder}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="button-secondary text-list-add" disabled={!value} onClick={add}>
          <Plus aria-hidden="true" />
          {ONBOARDING.add}
        </button>
      </div>
      <SelectionChips
        title={title}
        hideTitle
        chips={values.map((entry) => ({ key: entry, text: entry }))}
        onRemove={(chip) => onChange(values.filter((entry) => entry !== chip.key))}
      />
    </div>
  );
}

// Frage 3 „Nie vorschlagen“:
// - wenige häufige Beispiele als Chips, jedes auf eine Katalog-ID oder einen Tag abgebildet (A7)
// - Suche über alle Lebensmittel; ohne Treffer wird der Text eingetragen (Rückmeldung 12.10.)
// - was durch frühere Angaben schon ausgeschlossen ist, wird nicht nochmals angeboten
// - Marken und Herkunft als eigener Block; gespeichert, im Prototyp noch ohne Wirkung
export default function NeverPicker({ question, catalogIndex, answer, redundancy, onChange }) {
  const [query, setQuery] = useState('');
  const { selected, notes, brands, origins } = answer;

  function update(changes) {
    onChange({ ...answer, ...changes });
  }

  function toggleKey(key) {
    update({ selected: selected.includes(key) ? selected.filter((entry) => entry !== key) : [...selected, key] });
  }

  function addNote() {
    const text = cleanText(query);
    if (text && !notes.includes(text)) update({ notes: [...notes, text] });
    setQuery('');
  }

  const quickPicks = question.quickPicks.filter((pick) => selected.includes(pick.key) || !redundancy.key(pick.key));
  const hits = searchNever(question, catalogIndex, query, 8).map((hit) => ({ ...hit, selected: selected.includes(hit.key) }));
  const offered = hits.filter((hit) => hit.selected || !redundancy.key(hit.key)).slice(0, 6);
  const alreadyCovered = hits.length > 0 && offered.length === 0;

  const chips = [
    ...selected.map((key) => ({ key, text: keyLabel(question, catalogIndex, key) })),
    ...notes.map((note) => ({ key: `note:${note}`, text: note, note })),
  ];

  return (
    <div className="never-picker">
      {quickPicks.length > 0 && (
        <section aria-labelledby="quick-picks">
          <h3 id="quick-picks" className="chips-title">{ONBOARDING.quickPicksTitle}</h3>
          <div className="quick-picks">
            {quickPicks.map((pick) => {
              const on = selected.includes(pick.key);
              return (
                <button key={pick.key} type="button" className={`pick${on ? ' is-checked' : ''}`} aria-pressed={on} onClick={() => toggleKey(pick.key)}>
                  {pick.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <SearchField
        label={ONBOARDING.searchNeverLabel}
        placeholder={ONBOARDING.searchNeverPlaceholder}
        query={query}
        onQuery={setQuery}
        results={offered}
        onPick={(hit) => {
          toggleKey(hit.key);
          setQuery('');
        }}
        onSubmitText={addNote}
      >
        {alreadyCovered && <p className="note">{ONBOARDING.alreadyCovered}</p>}
        {!offered.some((hit) => hit.rank === 0) && !alreadyCovered && cleanText(query) && (
          <button type="button" className="button-secondary add-entry" onClick={addNote}>
            <Plus aria-hidden="true" />
            {ONBOARDING.addEntry(cleanText(query))}
          </button>
        )}
      </SearchField>

      <SelectionChips
        chips={chips}
        onRemove={(chip) => (chip.note ? update({ notes: notes.filter((note) => note !== chip.note) }) : toggleKey(chip.key))}
      />
      {notes.length > 0 && <p className="note">{ONBOARDING.entryEffect}</p>}

      <section className="brands-block" aria-labelledby="brands-title">
        <h3 id="brands-title" className="brands-title">{ONBOARDING.brandsBlockTitle}</h3>
        <TextList
          title={ONBOARDING.brandsTitle}
          placeholder={ONBOARDING.brandsPlaceholder}
          values={brands}
          onChange={(next) => update({ brands: next })}
        />
        <TextList
          title={ONBOARDING.originsTitle}
          placeholder={ONBOARDING.originsPlaceholder}
          values={origins}
          onChange={(next) => update({ origins: next })}
        />
        <p className="notice">
          <Info aria-hidden="true" />
          {ONBOARDING.brandsNotApplied}
        </p>
      </section>
    </div>
  );
}
