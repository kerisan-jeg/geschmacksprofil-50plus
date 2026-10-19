// Runde 1 zeigt auf allen Gruppen dasselbe neutrale Symbol (Dozentenfeedback 19.10.2026, Variante A).
// Unterscheidung über Titel und Kartenfarbe: Die Farben müssen sich deutlich unterscheiden. Das Symbol und jeder
// Text der Karte (Titel, Umschreibung, Art der Karte, Hinweise) erreichen auf jeder Kartenfarbe mindestens 4.5:1
// (A11), auch wenn Titel und Umschreibung heute auf Weiss stehen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const catalog = JSON.parse(read('./data/catalog.json'));
const tokens = read('./theme/tokens.css');
const groups = catalog.cards.filter((card) => card.stage === 1);

const rgb = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// OKLab (Björn Ottosson): Abstand ≈ wahrgenommener Farbunterschied
const oklab = (hex) => {
  const [r, g, b] = rgb(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};

test('Runde 1: 13 Gruppen mit je eigener, deutlich verschiedener Kartenfarbe', () => {
  assert.equal(groups.length, 13);
  assert.equal(new Set(groups.map((card) => card.tint)).size, 13);
  for (const a of groups) {
    for (const b of groups) {
      if (a.id >= b.id) continue;
      const distance = Math.hypot(...oklab(a.tint).map((value, i) => value - oklab(b.tint)[i]));
      assert.ok(distance >= 0.035, `${a.title} und ${b.title} zu ähnlich (${distance.toFixed(3)})`);
    }
  }
});

const token = (name) => tokens.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))[1];

test('Symbol und alle Kartentexte haben auf jeder Gruppenfarbe und auf Weiss mindestens 4.5:1 (A11)', () => {
  // Textfarben der Karte (card.css): Titel und Beispiele (ink), Umschreibung, Art der Karte und Symbol
  // (ink-secondary), Hinweise wie „Ohne Schweinefleisch“ (rule)
  const colors = { Titel: token('--color-ink'), 'Umschreibung, Art, Symbol': token('--color-ink-secondary'), Hinweis: token('--color-rule') };
  for (const background of [...groups.map((card) => [card.title, card.tint]), ['Weiss', token('--color-surface')]]) {
    for (const [role, color] of Object.entries(colors)) {
      const ratio = contrast(color, background[1]);
      assert.ok(ratio >= 4.5, `${role} auf ${background[0]}: ${ratio.toFixed(2)}:1`);
    }
  }
});

test('Runde 1: keine Beispiele; Umschreibungen nur dort, wo nötig, und als vorläufig gekennzeichnet (ohne Hülsenfrüchte)', () => {
  const described = groups.filter((card) => card.description);
  assert.deepEqual(described.map((card) => card.id), ['F08', 'F10', 'F11', 'F13']);
  assert.ok(described.every((card) => card.descriptionStatus === 'provisional'));
  assert.ok(!groups.find((card) => card.id === 'F05').description, 'Hülsenfrüchte ohne Umschreibung (Teamentscheid)');
});
