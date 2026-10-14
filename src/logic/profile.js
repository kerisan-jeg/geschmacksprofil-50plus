// Profil für die Anzeige („Mein Profil“). Reine Funktionen.
//
// Ausschlüsse werden getrennt vom Geschmack gezeigt, gruppiert nach ihrer Bedeutung:
//   allergies    – Allergene aus allergens.json (type "allergen")
//   intolerances – „Vertrage ich nicht“: beim Wischen (source "swipe") oder in Frage 2 gesucht
//   never        – „Möchte ich nicht essen“ (Frage 3)
//   notes        – eingetippte Einträge ohne Treffer (freeText, A7 bzw. Rückmeldung vom 12.10.)
// Die Ernährungsweise ist kein Eintrag (siehe filter.js) und wird separat angezeigt.

import { describeSelection } from './allergens.js';

export const EXCLUSION_SECTIONS = ['allergies', 'intolerances', 'never', 'notes'];

// Einträge aus dem Profil tragen ihren Abschnitt selbst (section), z. B. Laktose unter „Vertrage ich nicht“.
export function sectionOf(entry) {
  if (entry.section && EXCLUSION_SECTIONS.includes(entry.section)) return entry.section;
  if (entry.freeText) return 'notes';
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

// Einträge je Abschnitt, ohne Doppelte. Jedes Element:
//   { key, label, sources: ['onboarding' | 'swipe' | 'profile'], exclusions: [{ type, value }] }
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
    });
  }

  for (const entry of entries) {
    const section = sectionOf(entry);
    if (section === 'allergies') continue;
    const key = `${entry.type}:${entry.value}`;
    const existing = sections[section].find((item) => item.key === key);
    if (existing) {
      existing.sources = addSource(existing.sources, entry.source);
      continue;
    }
    sections[section].push({ key, label: entryLabel(entry, index), sources: [entry.source], exclusions: [{ type: entry.type, value: entry.value }] });
  }
  return sections;
}
