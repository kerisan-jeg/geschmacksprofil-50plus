import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, CircleHelp } from 'lucide-react';
import ChoiceList from './ChoiceList.jsx';
import DetailPicker from './DetailPicker.jsx';
import SearchField from './SearchField.jsx';
import SelectionChips from './SelectionChips.jsx';
import { categoryIds, categoryState, describeSelection, searchAllergens, setCategorySelection, toggleIds } from '../logic/allergens.js';
import { ONBOARDING } from '../labels.js';

// Allergene und Unverträglichkeiten (A5):
// - die häufigen als grosse Kacheln, der Rest über „Weitere anzeigen“ und die Suche
// - Nüsse und Gluten öffnen eine Detailauswahl („Alle Nüsse“ oder einzelne)
// - die Auswahl ist als Chips sichtbar
// - „Ich bin mir nicht sicher, ob es weitere gibt“ setzt nur ein Flag, keinen Ausschluss
export default function AllergenPicker({ data, answer, onChange }) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const [openCategory, setOpenCategory] = useState(null);
  const selected = answer.selected;

  const common = data.categories.filter((category) => category.common);
  const more = data.categories.filter((category) => !category.common);
  // Bereits gewählte „weitere“ Kategorien bleiben sichtbar, auch wenn die Liste zugeklappt ist.
  const visible = showAll ? data.categories : [...common, ...more.filter((category) => categoryState(category, selected).some)];

  function update(nextSelected) {
    onChange({ ...answer, selected: nextSelected });
  }

  function handleTile(category) {
    if (category.items) setOpenCategory(category);
    else update(toggleIds(selected, categoryIds(category)));
  }

  const results = searchAllergens(data, query).map((hit) => ({ ...hit, selected: hit.ids.every((id) => selected.includes(id)) }));

  return (
    <div className="allergen-picker">
      <div className="tiles">
        {visible.map((category) => {
          const state = categoryState(category, selected);
          const grouped = Boolean(category.items);
          return (
            <button
              key={category.id}
              type="button"
              className={`tile${state.some ? ' is-checked' : ''}`}
              aria-pressed={grouped ? undefined : state.all}
              aria-haspopup={grouped ? 'dialog' : undefined}
              onClick={() => handleTile(category)}
            >
              <span className="tile-text">
                <span className="tile-label">{category.tileLabel}</span>
                {grouped ? (
                  <span className="tile-detail">{state.some ? ONBOARDING.tileCount(state.count, state.total) : ONBOARDING.tileChooseDetail}</span>
                ) : (
                  category.detail && <span className="tile-detail">{category.detail}</span>
                )}
              </span>
              <span className="tile-mark" aria-hidden="true">
                {grouped ? <ChevronRight strokeWidth={2.6} /> : <Check strokeWidth={3.2} />}
              </span>
            </button>
          );
        })}
      </div>

      {more.length > 0 && (
        <button type="button" className="link-button more-button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
          <ChevronDown aria-hidden="true" className={showAll ? 'is-flipped' : undefined} />
          {showAll ? ONBOARDING.showLess : ONBOARDING.showMore(more.length)}
        </button>
      )}

      <SearchField
        label={ONBOARDING.searchAllergensLabel}
        placeholder={ONBOARDING.searchAllergensPlaceholder}
        query={query}
        onQuery={setQuery}
        results={results}
        onPick={(hit) => {
          update(toggleIds(selected, hit.ids));
          setQuery('');
        }}
      >
        {results.length === 0 && <p className="note">{ONBOARDING.noResult}</p>}
      </SearchField>

      <SelectionChips
        chips={describeSelection(data, selected)}
        onRemove={(chip) => update(selected.filter((id) => !chip.ids.includes(id)))}
      />

      <ChoiceList
        name="unsure-more"
        multiple
        options={[{ id: 'unsure', label: ONBOARDING.unsureMore }]}
        value={answer.unsureMore ? ['unsure'] : []}
        onChange={() => onChange({ ...answer, unsureMore: !answer.unsureMore })}
      />
      {answer.unsureMore && (
        <p className="notice">
          <CircleHelp aria-hidden="true" />
          {ONBOARDING.unsureHint}
        </p>
      )}

      {openCategory && (
        <DetailPicker
          title={openCategory.label}
          allLabel={openCategory.allLabel}
          sections={[{ id: openCategory.id, options: openCategory.items }]}
          initialSelected={selected.filter((id) => categoryIds(openCategory).includes(id))}
          requireSelection={false}
          onCancel={() => setOpenCategory(null)}
          onConfirm={(ids) => {
            update(setCategorySelection(selected, openCategory, ids));
            setOpenCategory(null);
          }}
        />
      )}
    </div>
  );
}
