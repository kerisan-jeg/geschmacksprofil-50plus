// Profil für die Anzeige („Mein Profil“). Reine Funktionen.
//
// Ausschlüsse werden getrennt vom Geschmack gezeigt, gruppiert nach ihrer Bedeutung:
//   allergies    – Allergene aus allergens.json (type "allergen")
//   intolerances – „Vertrage ich nicht“: beim Wischen (source "swipe") oder in Frage 2 gesucht
//   never        – „Möchte ich nicht essen“ (Frage 3)
//   notes        – eingetippte Einträge ohne Treffer (freeText, A7 bzw. Rückmeldung vom 12.10.)
// Die Ernährungsweise ist kein Eintrag (siehe filter.js) und wird separat angezeigt.

import { describeSelection } from './allergens.js';

// diet: Einzelausschlüsse aus Frage 1, Teil B (z. B. kein Schweinefleisch), bei der Ernährungsform angezeigt.
export const EXCLUSION_SECTIONS = ['diet', 'allergies', 'intolerances', 'never', 'notes'];

// Einträge aus dem Profil tragen ihren Abschnitt selbst (section), z. B. Laktose unter „Vertrage ich nicht“.
export function sectionOf(entry) {
  if (entry.section && EXCLUSION_SECTIONS.includes(entry.section)) return entry.section;
  if (entry.freeText) return 'notes';
  if (entry.origin === 'diet') return 'diet';
  if (entry.type === 'allergen') return 'allergies';
  if (entry.source === 'swipe' || entry.origin === 'intolerances') return 'intolerances';
  return 'never';
}

function addSource(sources, source) {
  return sources.includes(source) ? sources : [...sources, source];
}

function entryLabel(entry, index) {
  if (entry.label) return entry.label;
  if (entry.type === 'card') return index?.get(entry.value)?.title ?? entry.value;
  return entry.value;
}

// Zusätze nach nurec v0.2, Kap. 2.2 (Quelle, Geltungsbereich, Prüfstatus):
//   'check'   eingetippt ohne eindeutige Zuordnung (Notiz): Status „prüfen“
//   'medical' ärztlich oder fachlich festgestellt (Frage 2)
//   'limited' Geltungsbereich „kleine Mengen gehen“ (wird trotzdem nicht vorgeschlagen)
export function entryFlags(entries) {
  const flags = [];
  if (entries.some((entry) => entry.freeText)) flags.push('check');
  if (entries.some((entry) => entry.medical)) flags.push('medical');
  if (entries.some((entry) => entry.scope === 'limited')) flags.push('limited');
  return flags;
}

// Einträge je Abschnitt, ohne Doppelte. Jedes Element:
//   { key, label, sources: ['onboarding' | 'swipe' | 'profile'], exclusions: [{ type, value }], flags }
// Allergene werden wie im Onboarding zusammengefasst („Alle Nüsse (inkl. Erdnüsse)“ oder einzeln).
export function groupExclusions(entries, { allergens, index }) {
  const sections = Object.fromEntries(EXCLUSION_SECTIONS.map((id) => [id, []]));

  const allergenEntries = entries.filter((entry) => sectionOf(entry) === 'allergies');
  const selected = [...new Set(allergenEntries.map((entry) => entry.value))];
  for (const chip of describeSelection(allergens, selected)) {
    const sources = allergenEntries
      .filter((entry) => chip.ids.includes(entry.value))
      .reduce((list, entry) => addSource(list, entry.source), []);
    sections.allergies.push({
      key: `allergen:${chip.key}`,
      label: chip.text,
      sources,
      exclusions: chip.ids.map((value) => ({ type: 'allergen', value })),
      flags: entryFlags(allergenEntries.filter((entry) => chip.ids.includes(entry.value))),
    });
  }

  for (const entry of entries) {
    const section = sectionOf(entry);
    if (section === 'allergies') continue;
    const key = `${entry.type}:${entry.value}`;
    // Eingeschlossen (Gelatine bei „Kein Schweinefleisch“): gehört zum Hauptpunkt und wird mit ihm entfernt
    const parent = entry.includedBy && sections[section].find((item) => item.key === entry.includedBy);
    if (parent) {
      if (!parent.exclusions.some((other) => other.type === entry.type && other.value === entry.value)) parent.exclusions.push({ type: entry.type, value: entry.value });
      continue;
    }
    const existing = sections[section].find((item) => item.key === key);
    if (existing) {
      existing.sources = addSource(existing.sources, entry.source);
      existing.flags = [...new Set([...existing.flags, ...entryFlags([entry])])];
      continue;
    }
    sections[section].push({ key, label: entryLabel(entry, index), sources: [entry.source], exclusions: [{ type: entry.type, value: entry.value }], flags: entryFlags([entry]) });
  }
  return sections;
}

// ---------- Zusammenfassung vor der ersten Karte ----------

// nurec v0.2, Kap. 2.2: Vor Stufe 1 sieht die Person alle festen Regeln und bestätigt oder korrigiert sie.
// Ein Abschnitt je Frage, damit „Ändern“ direkt zur passenden Frage führt. Grundlage ist der aktuelle
// Stand (state aus deriveRoundState, inkl. Änderungen in „Mein Profil“): Es steht nur da, was der Filter
// wirklich ausschliesst. Eingetippte Einträge (Notizen) stehen bei der Frage, in der sie eingetragen wurden.
// Jeder Abschnitt: { id, items: [{ key, label }], notes: [label], open, brands, origins }
//   open: Unsicherheits-Flag aus Frage 2. Die Frage bleibt offen, daraus folgt keine Freigabe.
export const SUMMARY_SECTIONS = ['diet', 'intolerances', 'never'];

export function summarySections(state, { onboarding, diets, allergens, index, dietRules = [] }) {
  const grouped = groupExclusions(state.entries, { allergens, index });
  const plain = (items) => items.map(({ key, label, flags }) => ({ key, label, flags: flags ?? [] }));
  const notesOf = (question) => [
    ...new Set(
      state.entries
        .filter((entry) => sectionOf(entry) === 'notes' && (entry.origin === 'intolerances' ? 'intolerances' : 'never') === question)
        .map((entry) => entryLabel(entry, index))
    ),
  ];
  const dietRule = diets?.[state.diet]?.rule;
  return [
    {
      id: 'diet',
      items: [...(dietRule ? [{ key: `diet:${state.diet}`, label: dietRule, flags: [] }] : []), ...plain(grouped.diet)],
      notes: [],
      open: false,
      brands: [],
      origins: [],
      // Speisevorschriften (Teil C): als Angabe gezeigt, ohne eigene Wirkung
      dietaryRules: (onboarding?.dietaryRules ?? []).map((id) => dietRules.find((rule) => rule.id === id)?.label ?? id),
    },
    {
      id: 'intolerances',
      items: plain([...grouped.allergies, ...grouped.intolerances]),
      notes: notesOf('intolerances'),
      open: Boolean(onboarding?.uncertain),
      brands: [],
      origins: [],
    },
    {
      id: 'never',
      items: plain(grouped.never),
      notes: notesOf('never'),
      open: false,
      brands: [...(onboarding?.avoidBrands ?? [])],
      origins: [...(onboarding?.avoidOrigins ?? [])],
    },
  ];
}

// Gibt es überhaupt etwas zu bestätigen (Regel, Notiz, Marke oder Herkunft)?
export function hasSummaryRules(sections) {
  return sections.some((section) => section.items.length + section.notes.length + section.brands.length + section.origins.length > 0);
}
