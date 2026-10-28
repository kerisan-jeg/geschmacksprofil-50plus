// Bilder auf allen Karten (Addendum A15): Datenmodell, Dateien und Prompts für die fehlenden Bilder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { IMAGE_SOURCES, validateCatalog } from '../logic/catalog.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const cards = read('./catalog.json').cards;
const manifest = read('./card-image-prompts.json');
const publicPath = (path) => fileURLToPath(new URL(`../../public/${path}`, import.meta.url));

// Breite und Höhe aus dem Kopf einer WebP-Datei (verlustbehaftet VP8, verlustfrei VP8L, erweitert VP8X)
function webpSize(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  return null;
}

test('Jede Katalogkarte mit Bild hat einen deutschen alt-Text, eine eigene Datei und eine bekannte Quelle', () => {
  const withImage = cards.filter((card) => card.image);
  assert.ok(withImage.length >= 60);
  for (const card of withImage) {
    const { image } = card;
    assert.equal(image.src, `cards/${card.id}.webp`, card.id);
    assert.ok(image.alt?.trim().length >= 8, `${card.id}: alt-Text`);
    assert.doesNotMatch(image.alt, /^(bild|foto|image|photo)\b/i, `${card.id}: alt-Text beschreibt den Inhalt`);
    assert.ok(IMAGE_SOURCES.includes(image.source), `${card.id}: Quelle ${image.source}`);
    if (image.source === 'stock') assert.ok(image.license && image.credit, `${card.id}: Lizenz und Nachweis`);
    assert.ok(image.shows?.length > 0 && image.foods?.length > 0, `${card.id}: was das Bild zeigt (Ausschluss-Filter)`);
  }
  // Gruppenbilder (21.10.2026): drei Fotos mit Nachweis
  for (const family of cards.filter((card) => card.stage === 1)) {
    assert.ok(Array.isArray(family.image?.credit) && family.image.credit.length === 3, `${family.id}: Gruppenbild aus drei Fotos`);
  }
});

test('Bilddateien und Teilbilder der Gruppen: WebP, 4:3, höchstens 1200 px breit, höchstens 150 KB', () => {
  const files = cards.filter((entry) => entry.image).flatMap((card) => [card.image.src, ...(card.image.parts ?? []).map((part) => part.src)]);
  assert.equal(files.length, cards.length + 13 * 3, 'jede Karte ein Bild, jede Gruppe drei Teilbilder');
  for (const src of files) {
    const path = publicPath(src);
    assert.ok(existsSync(path), `${src} fehlt`);
    const size = webpSize(readFileSync(path));
    assert.ok(size, `${src}: WebP`);
    assert.ok(size.width <= 1200, `${src}: ${size.width} px breit`);
    assert.equal(size.width * 3, size.height * 4, `${src}: 4:3`);
    assert.ok(statSync(path).size <= 150 * 1024, `${src}: ${Math.round(statSync(path).size / 1024)} KB`);
  }
});

test('Teilbilder der Gruppen: shows des Gruppenbilds ist die Vereinigung der Teile', () => {
  for (const family of cards.filter((card) => card.stage === 1)) {
    const union = [...new Set(family.image.parts.flatMap((part) => part.shows))];
    assert.deepEqual([...family.image.shows].sort(), union.sort(), family.id);
    assert.ok(family.image.parts.every((part) => part.alt?.trim().length >= 5), `${family.id}: alt-Texte der Teile`);
  }
});

test('Katalogprüfung: Bild ohne alt-Text, mit falschem Pfad oder Gruppenbild ohne Nachweise ist ein Fehler', () => {
  assert.deepEqual(validateCatalog(cards), []);
  const broken = cards.map((card) => {
    if (card.id === 'F01.1') return { ...card, image: { ...card.image, alt: ' ' } };
    if (card.id === 'F01.2') return { ...card, image: { ...card.image, src: 'images/F01.2.jpg', source: 'web' } };
    if (card.id === 'F01') return { ...card, image: { ...card.image, credit: undefined } };
    return card;
  });
  const errors = validateCatalog(broken);
  assert.ok(errors.includes('F01.1: Bild ohne alt-Text'));
  assert.ok(errors.includes('F01.2: Bild muss cards/F01.2.webp sein'));
  assert.ok(errors.includes('F01.2: Bildquelle web unbekannt'));
  assert.ok(errors.includes('F01: Gruppenbild ohne Nachweise der Fotos'));
});

test('Gemini-Prompts (seit A16 nicht mehr benötigt) bleiben als gültige Unterlage erhalten', () => {
  assert.match(manifest.status, /^Nicht mehr benötigt/);
  const ids = new Set(cards.map((card) => card.id));
  for (const entry of manifest.prompts) {
    assert.ok(ids.has(entry.cardId), `${entry.cardId}: Karte unbekannt`);
    assert.notEqual(cards.find((card) => card.id === entry.cardId).stage, 1, `${entry.cardId}: keine Gruppen`);
    assert.ok(entry.alt?.trim().length >= 8, `${entry.cardId}: alt-Text`);
    assert.ok(entry.shows.every((id) => ids.has(id)) && entry.foods.length > 0, `${entry.cardId}: shows und foods`);
    assert.match(entry.prompt, /4:3$/, `${entry.cardId}: Seitenverhältnis`);
  }
  assert.ok(manifest.unused.dishes.includes('lachs_ofengemuese') && manifest.unused.families.includes('suesses'));
});

test('A16: Bildinhalt ehrlich beschrieben; unsichere Inhalte als TODO; Karten ohne passendes Bild stehen auf der Liste', () => {
  const credits = read('./image-credits.json');
  const listed = new Map((credits.withoutPhoto ?? []).map((entry) => [entry.cardId, entry]));
  for (const card of cards.filter((entry) => entry.stage > 1)) {
    if (card.image) {
      assert.ok(!listed.has(card.id), `${card.id}: Bild und zugleich „ohne passendes Bild“`);
      if (card.image.todo !== undefined) assert.ok(card.image.todo.trim().length > 10, `${card.id}: TODO mit Begründung`);
    } else {
      assert.ok(listed.has(card.id), `${card.id} (${card.title}): ohne Bild, aber nicht auf der Liste`);
    }
  }
  // Käse im Bild: Die Käse-Karte steht in shows, damit das Bild bei ausgeschlossenem Käse nicht erscheint
  // (Chili con Carne hat seit dem 28.10.2026 ein Foto ohne Käse und Sauerrahm)
  assert.ok(!cards.find((card) => card.id === 'D11').image.shows.some((cardId) => cardId.startsWith('F04')), 'D11: kein Milchprodukt mehr im Bild');
  for (const id of ['D01', 'D02', 'D03', 'D21']) {
    const shows = cards.find((card) => card.id === id).image?.shows ?? [];
    assert.ok(shows.some((cardId) => cardId.startsWith('F04.2')), `${id}: Käse in shows`);
  }
});
