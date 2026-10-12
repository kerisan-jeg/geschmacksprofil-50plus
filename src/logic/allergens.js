// Allergenliste (allergens.json): Auswahl, Zusammenfassung und Suche.
// Gespeichert werden immer die granularen IDs (z. B. "hazelnut"), nie die Kategorie.
// „Alle Nüsse“ wählt alle Einträge der Kategorie aus und wird in der Anzeige wieder zusammengefasst.

import { search } from './search.js';

// Granulare IDs einer Kategorie. Kategorien ohne Unterauswahl haben genau eine ID (ihre eigene).
export function categoryIds(category) {
  return category.items ? category.items.map((item) => item.id) : [category.id];
}

export function allAllergenIds(data) {
  return data.categories.flatMap(categoryIds);
}

export function categoryState(category, selected) {
  const ids = categoryIds(category);
  const chosen = ids.filter((id) => selected.includes(id));
  return { all: chosen.length === ids.length, some: chosen.length > 0, count: chosen.length, total: ids.length };
}

function withoutDuplicates(list) {
  return [...new Set(list)];
}

export function toggleIds(selected, ids) {
  const allSelected = ids.every((id) => selected.includes(id));
  return allSelected ? selected.filter((id) => !ids.includes(id)) : withoutDuplicates([...selected, ...ids]);
}

export function setCategorySelection(selected, category, ids) {
  const own = categoryIds(category);
  return withoutDuplicates([...selected.filter((id) => !own.includes(id)), ...ids]);
}

// Anzeige der Auswahl als Chips: eine Zeile pro Kategorie, „Alle …“ zusammengefasst.
export function describeSelection(data, selected) {
  const chips = [];
  for (const category of data.categories) {
    const ids = categoryIds(category).filter((id) => selected.includes(id));
    if (ids.length === 0) continue;
    if (!category.items) {
      chips.push({ key: category.id, text: category.label, ids });
    } else if (ids.length === category.items.length) {
      chips.push({ key: category.id, text: category.allLabel, ids });
    } else {
      for (const item of category.items.filter((entry) => ids.includes(entry.id))) {
        chips.push({ key: item.id, text: item.label, ids: [item.id], category: category.tileLabel });
      }
    }
  }
  return chips;
}

// Kurztext für die Zusammenfassung vor dem Wischen, z. B. „Nüsse: Haselnuss, Mandel“.
export function summarizeSelection(data, selected) {
  const lines = [];
  for (const category of data.categories) {
    const ids = categoryIds(category).filter((id) => selected.includes(id));
    if (ids.length === 0) continue;
    if (!category.items) lines.push({ key: category.id, text: category.label });
    else if (ids.length === category.items.length) lines.push({ key: category.id, text: category.allLabel.replace(/\s*\(.*\)$/, '') });
    else {
      const names = category.items.filter((item) => ids.includes(item.id)).map((item) => item.label);
      lines.push({ key: category.id, text: `${category.tileLabel}: ${names.join(', ')}` });
    }
  }
  return lines;
}

export function allergenLabel(data, id) {
  for (const category of data.categories) {
    if (!category.items && category.id === id) return category.tileLabel;
    const item = category.items?.find((entry) => entry.id === id);
    if (item) return item.label;
  }
  return id;
}

// Suchindex: ganze Kategorien („Alle Nüsse“) und einzelne Einträge („Haselnuss“).
export function allergenSearchItems(data) {
  const items = [];
  for (const category of data.categories) {
    if (category.items) {
      items.push({
        key: `all:${category.id}`,
        label: category.allLabel,
        detail: category.label,
        ids: categoryIds(category),
        terms: [category.label, category.tileLabel, ...(category.synonyms ?? [])],
      });
      for (const item of category.items) {
        items.push({ key: item.id, label: item.label, detail: category.tileLabel, ids: [item.id], terms: [] });
      }
    } else {
      items.push({
        key: category.id,
        label: category.label,
        detail: category.detail ?? null,
        ids: [category.id],
        terms: [category.tileLabel, ...(category.synonyms ?? [])],
      });
    }
  }
  return items;
}

export function searchAllergens(data, query, limit = 6) {
  return search(allergenSearchItems(data), query, limit);
}
