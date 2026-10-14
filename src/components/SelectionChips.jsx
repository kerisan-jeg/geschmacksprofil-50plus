import { X } from 'lucide-react';
import { ONBOARDING } from '../labels.js';

// Gewählte Einträge als Chips. Jeder Chip lässt sich mit einer Tippfläche ≥ 44 px entfernen.
// chips: [{ key, text, tag?, kind? }]; kind 'note' wird als Notiz dargestellt.
export default function SelectionChips({ title = ONBOARDING.selectedTitle, hideTitle = false, chips, onRemove }) {
  if (chips.length === 0) return null;
  return (
    <section className="chips-block" aria-label={title}>
      {!hideTitle && <h3 className="chips-title">{title}</h3>}
      <ul className="chips">
        {chips.map((chip) => (
          <li key={chip.key} className={`chip${chip.kind === 'note' ? ' is-note' : ''}`}>
            <span className="chip-text">{chip.text}</span>
            <button type="button" className="chip-remove" onClick={() => onRemove(chip)} aria-label={ONBOARDING.removeChip(chip.text)}>
              <X aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
