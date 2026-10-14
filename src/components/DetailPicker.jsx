import { useId, useState } from 'react';
import ChoiceList from './ChoiceList.jsx';
import Sheet from './Sheet.jsx';
import { PICKER } from '../labels.js';

// Detailauswahl als Bottom Sheet: „ganze Familie“ oder einzelne Einträge.
// Wird im Onboarding (z. B. Nüsse, Gluten), im Profil und beim Wischen („Vertrage ich nicht“ auf einer
// Familienkarte) gleich verwendet, damit nicht aus Versehen eine ganze Familie gesperrt wird.
//
// sections: [{ id, label?, options: [{ id, label, detail? }] }]
// onConfirm(selectedIds) liefert immer die einzelnen Einträge; „Alle“ wählt nur alle aus.
export default function DetailPicker({ title, intro, allLabel, sections, initialSelected = [], requireSelection = true, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(initialSelected);
  const [showError, setShowError] = useState(false);
  const nameBase = useId();
  const allIds = sections.flatMap((section) => section.options.map((option) => option.id));
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));

  function toggleIds(ids) {
    const every = ids.every((id) => selected.includes(id));
    setSelected(every ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
    setShowError(false);
  }

  function handleConfirm() {
    if (requireSelection && selected.length === 0) {
      setShowError(true);
      return;
    }
    onConfirm(allIds.filter((id) => selected.includes(id)));
  }

  return (
    <Sheet title={title} intro={intro} onClose={onCancel}>
      <div className="sheet-body">
        {allLabel && (
          <ChoiceList
            name={`${nameBase}-all`}
            multiple
            options={[{ id: 'all', label: allLabel }]}
            value={allSelected ? ['all'] : []}
            onChange={() => toggleIds(allIds)}
          />
        )}
        {sections.map((section) => {
          const ids = section.options.map((option) => option.id);
          return (
            <section key={section.id} className="sheet-section" aria-label={section.label ?? title}>
              {section.label && (
                <div className="sheet-section-head">
                  <h3>{section.label}</h3>
                  {ids.length > 1 && (
                    <button type="button" className="button-ghost is-strong" onClick={() => toggleIds(ids)}>
                      {PICKER.selectSection(section.label)}
                    </button>
                  )}
                </div>
              )}
              <ChoiceList
                name={`${nameBase}-${section.id}`}
                multiple
                layout="wrap"
                options={section.options}
                value={selected.filter((id) => ids.includes(id))}
                onChange={(id) => toggleIds([id])}
              />
            </section>
          );
        })}
      </div>

      {showError && (
        <p className="form-error" role="alert">
          {PICKER.nothingSelected}
        </p>
      )}
      <div className="sheet-actions">
        <button type="button" className="button-secondary" onClick={onCancel}>
          {PICKER.cancel}
        </button>
        <button type="button" className="button-primary" onClick={handleConfirm}>
          {PICKER.confirm}
        </button>
      </div>
    </Sheet>
  );
}
