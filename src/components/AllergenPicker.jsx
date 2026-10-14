import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, CircleHelp } from 'lucide-react';
import ChoiceList from './ChoiceList.jsx';
import DetailPicker from './DetailPicker.jsx';
import FoodSearch from './FoodSearch.jsx';
import SelectionChips from './SelectionChips.jsx';
import { categoryIds, categoryState, describeSelection, setCategorySelection, toggleIds } from '../logic/allergens.js';
import { buildFoodIndex } from '../logic/foodSearch.js';
import { keyLabel } from '../logic/stage0.js';
import { ONBOARDING } from '../labels.js';

const NEVER_REDUNDANT = { category: () => false, allergenIds: () => false, hit: () => false };

// Allergene und Unverträglichkeiten, im Onboarding (Frage 2) und in „Mein Profil“ dieselbe Komponente:
// - die häufigen als grosse Kacheln, der Rest über „Weitere anzeigen“ und die Suche (A5)
// - Nüsse (inkl. Erdnüsse) und Gluten öffnen eine Detailauswahl (ganze Familie oder einzelne Einträge)
// - die Suche (FoodSearch) findet auch alle Lebensmittel aus dem Katalog; ohne Treffer wird eine Notiz
//   eingetragen (A7). Im Profil (allowFoods = false) sucht sie nur Allergene.
// - was durch die Ernährungsweise schon ausgeschlossen ist, wird nicht nochmals angeboten
//   (ausser es ist bereits ausgewählt)
// - „Ich bin mir nicht sicher, ob es weitere gibt“ setzt nur ein Flag, keinen Ausschluss
export default function AllergenPicker({ data, catalogIndex, foods = [], answer, redundancy = NEVER_REDUNDANT, onChange, allowFoods = true, allowUnsure = true }) {
  const [showAll, setShowAll] = useState(false);
  const [openCategory, setOpenCategory] = useState(null);
  const { selected } = answer;
  const items = answer.items ?? [];
  const notes = answer.notes ?? [];
  const searchIndex = useMemo(
    () => buildFoodIndex({ allergens: data, catalogIndex: allowFoods ? catalogIndex : null, foods: allowFoods ? foods : [] }),
    [data, catalogIndex, foods, allowFoods]
  );

  const relevant = (category) => categoryState(category, selected).some || !redundancy.category(category);
  const common = data.categories.filter((category) => category.common && relevant(category));
  const more = data.categories.filter((category) => !category.common && relevant(category));
  // Bereits gewählte „weitere“ Kategorien bleiben sichtbar, auch wenn die Liste zugeklappt ist.
  const visible = showAll ? [...common, ...more] : [...common, ...more.filter((category) => categoryState(category, selected).some)];
  const hiddenMore = more.filter((category) => !visible.includes(category)).length;

  function update(changes) {
    onChange({ ...answer, ...changes });
  }

  function handleTile(category) {
    if (category.items) setOpenCategory(category);
    else update({ selected: toggleIds(selected, categoryIds(category)) });
  }

  function handlePick(hit) {
    if (hit.kind === 'allergen') update({ selected: toggleIds(selected, hit.ids) });
    else update({ items: items.includes(hit.key) ? items.filter((key) => key !== hit.key) : [...items, hit.key] });
  }

  function addNote(text) {
    if (!notes.includes(text)) update({ notes: [...notes, text] });
  }

  const chips = [
    ...describeSelection(data, selected).map((chip) => ({ ...chip, kind: 'allergen' })),
    ...items.map((key) => ({ key, text: keyLabel(null, catalogIndex, key), kind: 'item' })),
    ...notes.map((note) => ({ key: `note:${note}`, text: note, kind: 'note', note })),
  ];

  function removeChip(chip) {
    if (chip.kind === 'allergen') update({ selected: selected.filter((id) => !chip.ids.includes(id)) });
    else if (chip.kind === 'item') update({ items: items.filter((key) => key !== chip.key) });
    else update({ notes: notes.filter((note) => note !== chip.note) });
  }

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
                  <span className="tile-detail">
                    {state.some ? ONBOARDING.tileCount(state.count, state.total) : category.tileDetail ?? ONBOARDING.tileChooseDetail}
                  </span>
                ) : (
                  category.detail && <span className="tile-detail">{category.detail}</span>
                )}
              </span>
              <span className="tile-mark" aria-hidden="true">
                {grouped ? <ChevronRight /> : <Check />}
              </span>
            </button>
          );
        })}
      </div>

      {more.length > 0 && (hiddenMore > 0 || showAll) && (
        <button type="button" className="button-ghost is-strong more-button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
          <ChevronDown aria-hidden="true" className={showAll ? 'is-flipped' : undefined} />
          {showAll ? ONBOARDING.showLess : ONBOARDING.showMore(hiddenMore)}
        </button>
      )}

      <FoodSearch
        label={ONBOARDING.searchAllergensLabel}
        placeholder={ONBOARDING.searchAllergensPlaceholder}
        items={searchIndex}
        isSelected={(hit) => (hit.kind === 'allergen' ? hit.ids.every((id) => selected.includes(id)) : items.includes(hit.key))}
        isOffered={(hit) => !redundancy.hit(hit)}
        onPick={handlePick}
        onAddNote={allowFoods ? addNote : null}
      />

      <SelectionChips chips={chips} onRemove={removeChip} />
      {notes.length > 0 && <p className="note">{ONBOARDING.entryEffect}</p>}

      {allowUnsure && (
        <>
          <ChoiceList
            name="unsure-more"
            multiple
            options={[{ id: 'unsure', label: ONBOARDING.unsureMore }]}
            value={answer.unsureMore ? ['unsure'] : []}
            onChange={() => update({ unsureMore: !answer.unsureMore })}
          />
          {answer.unsureMore && (
            <p className="notice">
              <CircleHelp aria-hidden="true" />
              {ONBOARDING.unsureHint}
            </p>
          )}
        </>
      )}

      {openCategory && (
        <DetailPicker
          title={openCategory.label}
          allLabel={openCategory.allLabel}
          sections={[
            {
              id: openCategory.id,
              options: openCategory.items.filter((item) => selected.includes(item.id) || !redundancy.allergenIds([item.id])),
            },
          ]}
          initialSelected={selected.filter((id) => categoryIds(openCategory).includes(id))}
          requireSelection={false}
          onCancel={() => setOpenCategory(null)}
          onConfirm={(ids) => {
            update({ selected: setCategorySelection(selected, openCategory, ids) });
            setOpenCategory(null);
          }}
        />
      )}
    </div>
  );
}
