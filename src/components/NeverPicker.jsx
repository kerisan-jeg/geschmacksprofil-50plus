import { useId, useMemo, useState } from 'react';
import { Info, Plus } from 'lucide-react';
import FoodSearch from './FoodSearch.jsx';
import SelectionChips from './SelectionChips.jsx';
import { buildFoodIndex } from '../logic/foodSearch.js';
import { cleanText, keyLabel } from '../logic/stage0.js';
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
// - Suche (FoodSearch) über alle Lebensmittel; ohne Treffer wird eine Notiz eingetragen (A7)
// - was durch frühere Angaben schon ausgeschlossen ist, wird nicht nochmals angeboten
// - Marken und Herkunft als eigener Block; gespeichert, im Prototyp noch ohne Wirkung
export default function NeverPicker({ question, catalogIndex, foods = [], answer, redundancy, onChange }) {
  const { selected, notes, brands, origins } = answer;
  const searchIndex = useMemo(() => buildFoodIndex({ catalogIndex, foods, tagLabels: question.tagLabels }), [catalogIndex, foods, question]);

  function update(changes) {
    onChange({ ...answer, ...changes });
  }

  function toggleKey(key) {
    update({ selected: selected.includes(key) ? selected.filter((entry) => entry !== key) : [...selected, key] });
  }

  function addNote(text) {
    if (!notes.includes(text)) update({ notes: [...notes, text] });
  }

  const quickPicks = question.quickPicks.filter((pick) => selected.includes(pick.key) || !redundancy.key(pick.key));

  const chips = [
    ...selected.map((key) => ({ key, text: keyLabel(question, catalogIndex, key) })),
    ...notes.map((note) => ({ key: `note:${note}`, text: note, note, kind: 'note' })),
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

      <FoodSearch
        label={ONBOARDING.searchNeverLabel}
        placeholder={ONBOARDING.searchNeverPlaceholder}
        items={searchIndex}
        isSelected={(hit) => selected.includes(hit.key)}
        isOffered={(hit) => !redundancy.key(hit.key)}
        onPick={(hit) => toggleKey(hit.key)}
        onAddNote={addNote}
      />

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
