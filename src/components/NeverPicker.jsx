import { useMemo } from 'react';
import FoodSearch from './FoodSearch.jsx';
import SelectionChips from './SelectionChips.jsx';
import { buildFoodIndex } from '../logic/foodSearch.js';
import { keyLabel } from '../logic/stage0.js';
import { ONBOARDING } from '../labels.js';

// Frage 3 „Nie vorschlagen“:
// - wenige häufige Beispiele als Chips, jedes auf eine Katalog-ID oder einen Tag abgebildet (A7)
// - Suche (FoodSearch) über alle Lebensmittel; ohne Treffer wird eine Notiz eingetragen (A7)
// - was durch frühere Angaben schon ausgeschlossen ist, wird nicht nochmals angeboten
// Marken und Herkunft gibt es seit dem 28.10.2026 nicht mehr (Teamentscheid: ohne Wirkung, überflüssig).
export default function NeverPicker({ question, catalogIndex, foods = [], answer, redundancy, onChange }) {
  const { selected, notes } = answer;
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
    </div>
  );
}
