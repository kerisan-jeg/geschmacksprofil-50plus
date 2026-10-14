import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, CircleHelp, Plus } from 'lucide-react';
import ChoiceList from './ChoiceList.jsx';
import DetailPicker from './DetailPicker.jsx';
import SearchField from './SearchField.jsx';
import SelectionChips from './SelectionChips.jsx';
import { categoryIds, categoryState, describeSelection, setCategorySelection, toggleIds } from '../logic/allergens.js';
import { cleanText, keyLabel, searchIntolerances } from '../logic/stage0.js';
import { ONBOARDING } from '../labels.js';

// Allergene und Unverträglichkeiten:
// - die häufigen als grosse Kacheln, der Rest über „Weitere anzeigen“ und die Suche (A5)
// - Nüsse (inkl. Erdnüsse) und Gluten öffnen eine Detailauswahl
// - die Suche findet auch alle Lebensmittel aus dem Katalog; ohne Treffer wird der Text eingetragen
// - was durch die Ernährungsweise schon ausgeschlossen ist, wird nicht nochmals angeboten
//   (ausser es ist bereits ausgewählt)
// - „Ich bin mir nicht sicher, ob es weitere gibt“ setzt nur ein Flag, keinen Ausschluss
export default function AllergenPicker({ data, catalogIndex, answer, redundancy, onChange }) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const [openCategory, setOpenCategory] = useState(null);
  const { selected, items, notes } = answer;

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
    setQuery('');
  }

  function addNote() {
    const text = cleanText(query);
    if (text && !notes.includes(text)) update({ notes: [...notes, text] });
    setQuery('');
  }

  const hits = searchIntolerances(data, catalogIndex, query, 8).map((hit) => ({
    ...hit,
    selected: hit.kind === 'allergen' ? hit.ids.every((id) => selected.includes(id)) : items.includes(hit.key),
  }));
  const offered = hits.filter((hit) => hit.selected || !redundancy.hit(hit)).slice(0, 6);
  const alreadyCovered = hits.length > 0 && offered.length === 0;

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

      <SearchField
        label={ONBOARDING.searchAllergensLabel}
        placeholder={ONBOARDING.searchAllergensPlaceholder}
        query={query}
        onQuery={setQuery}
        results={offered}
        onPick={handlePick}
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

      <SelectionChips chips={chips} onRemove={removeChip} />
      {notes.length > 0 && <p className="note">{ONBOARDING.entryEffect}</p>}

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
