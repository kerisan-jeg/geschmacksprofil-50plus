import { Check } from 'lucide-react';

// Auswahl mit echten Radio- oder Checkbox-Feldern: Tastatur und Screenreader funktionieren wie gewohnt.
// Der ganze Rahmen ist die Tippfläche; ausgewählt heisst Rahmen, Farbe und Häkchen, nicht Farbe allein.
export default function ChoiceList({ name, options, value, onChange, multiple = false, layout = 'list', labelledBy }) {
  const selected = multiple ? new Set(value) : null;

  return (
    <div
      className={`choices choices-${layout}`}
      role={multiple ? 'group' : 'radiogroup'}
      aria-labelledby={labelledBy}
      style={layout === 'row' ? { '--count': options.length } : undefined}
    >
      {options.map((option) => {
        const checked = multiple ? selected.has(option.id) : value === option.id;
        const classes = ['choice'];
        if (multiple) classes.push('is-checkbox');
        if (checked) classes.push('is-checked');
        return (
          <label key={option.id} className={classes.join(' ')}>
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={name}
              value={option.id}
              checked={checked}
              onChange={() => onChange(option.id)}
            />
            <span className="choice-mark" aria-hidden="true">
              <Check strokeWidth={3.2} />
            </span>
            <span className="choice-text">
              <span className="choice-label">{option.label}</span>
              {option.detail && <span className="choice-detail">{option.detail}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
