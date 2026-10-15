import { useMemo } from 'react';
import FoodSearch from './FoodSearch.jsx';
import SelectionChips from './SelectionChips.jsx';
import brands from '../data/brands.json';
import { brandItems, matchBrand } from '../logic/practical.js';
import { ONBOARDING, PROFILE, SEARCH } from '../labels.js';

// Marken und Händler genau zuordnen (nurec v0.2, Bereich 0.6 und Alltagsprofil Kap. 2.3):
// Vorschläge aus einer Liste häufiger Schweizer Händler und Marken („M-Budget · Marke von Migros“). Was nicht in
// der Liste steht, lässt sich trotzdem eintragen; es erscheint als Notiz mit Status „prüfen“.
// Eine Marke wird nie auf Schwester-Marken ausgeweitet: Gespeichert wird genau der gewählte Name.
// values: Liste von Namen (Text). onChange(nextValues).
export default function BrandField({ label, placeholder, values, onChange }) {
  const items = useMemo(() => brandItems(brands, SEARCH), []);

  function add(name) {
    if (!values.some((value) => value.toLowerCase() === name.toLowerCase())) onChange([...values, name]);
  }

  return (
    <div className="text-list">
      <FoodSearch
        label={label}
        placeholder={placeholder}
        items={items}
        isSelected={(hit) => values.includes(hit.label)}
        onPick={(hit) => add(hit.label)}
        onAddNote={add}
        noteLabel={ONBOARDING.brandAddNote}
        noteHint={PROFILE.statusCheckHint}
      />
      <SelectionChips
        title={label}
        hideTitle
        chips={values.map((value) => ({ key: value, text: value, kind: matchBrand(brands, value) ? undefined : 'note' }))}
        onRemove={(chip) => onChange(values.filter((value) => value !== chip.key))}
      />
    </div>
  );
}
