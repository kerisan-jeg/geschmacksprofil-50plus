import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import ChoiceList from './ChoiceList.jsx';
import { PICKER } from '../labels.js';

// Detailauswahl als Bottom Sheet: „ganze Familie“ oder einzelne Einträge.
// Wird im Onboarding (z. B. Nüsse, Gluten) und beim Wischen („Vertrage ich nicht“ auf einer
// Familienkarte) gleich verwendet, damit nicht aus Versehen eine ganze Familie gesperrt wird.
//
// sections: [{ id, label?, options: [{ id, label, detail? }] }]
// onConfirm(selectedIds) liefert immer die einzelnen Einträge; „Alle“ wählt nur alle aus.
export default function DetailPicker({ title, intro, allLabel, sections, initialSelected = [], requireSelection = true, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(initialSelected);
  const [showError, setShowError] = useState(false);
  const headingId = useId();
  const headingRef = useRef(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  const allIds = sections.flatMap((section) => section.options.map((option) => option.id));
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));

  // Nur beim Öffnen: Fokus in den Dialog, Hintergrund nicht scrollen, Escape schliesst.
  useEffect(() => {
    const opener = document.activeElement;
    headingRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKey(event) {
      if (event.key === 'Escape') cancelRef.current();
    }
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', handleKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

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
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={headingId} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <h2 id={headingId} ref={headingRef} tabIndex={-1}>{title}</h2>
          <button type="button" className="icon-button" onClick={onCancel} aria-label={PICKER.cancel}>
            <X aria-hidden="true" />
          </button>
        </div>
        {intro && <p className="note">{intro}</p>}

        <div className="sheet-body">
          {allLabel && (
            <ChoiceList
              name={`${headingId}-all`}
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
                      <button type="button" className="link-button" onClick={() => toggleIds(ids)}>
                        {PICKER.selectSection(section.label)}
                      </button>
                    )}
                  </div>
                )}
                <ChoiceList
                  name={`${headingId}-${section.id}`}
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
          <p className="form-error" role="alert">{PICKER.nothingSelected}</p>
        )}
        <div className="sheet-actions">
          <button type="button" className="button-secondary" onClick={onCancel}>{PICKER.cancel}</button>
          <button type="button" className="button-primary" onClick={handleConfirm}>{PICKER.confirm}</button>
        </div>
      </div>
    </div>
  );
}
