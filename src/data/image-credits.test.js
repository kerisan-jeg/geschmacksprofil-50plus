import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const credits = read('./image-credits.json');
const cards = read('./catalog.json').cards;
const families = cards.filter((card) => card.stage === 1);
const subgroups = cards.filter((card) => card.stage === 2);
// Für diese Untergruppen gibt es noch kein passendes freies Foto (README, „Noch offen“): Sie zeigen die Illustration.
const WITHOUT_PHOTO = ['F07.2', 'F07.3'];
const imagePath = (file) => fileURLToPath(new URL(`../../public/images/${file}`, import.meta.url));

function jpegSize(buffer) {
  // Breite und Höhe aus dem SOF-Segment einer JPEG-Datei
  let offset = 2;
  while (offset < buffer.length) {
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    offset += 2 + length;
  }
  return null;
}

test('Jede Gruppe zeigt ihre drei Beispiele als Bildraster, jede Untergruppe hat ein eigenes Foto', () => {
  const keys = new Set(credits.photos.map((photo) => photo.key));
  assert.deepEqual(Object.keys(credits.collages).sort(), families.map((card) => card.id).sort());
  for (const [cardId, collage] of Object.entries(credits.collages)) {
    assert.equal(collage.length, 3, `${cardId}: drei Beispiele`);
    for (const key of collage) assert.ok(keys.has(key), `${cardId}: ${key} fehlt`);
  }
  const withPhoto = credits.photos.filter((photo) => photo.cardId).map((photo) => photo.cardId).sort();
  assert.deepEqual(withPhoto, subgroups.map((card) => card.id).filter((id) => !WITHOUT_PHOTO.includes(id)).sort());
  // Jedes Foto erscheint irgendwo, keines doppelt
  const used = new Set([...withPhoto, ...Object.values(credits.collages).flat()]);
  for (const photo of credits.photos) assert.ok(used.has(photo.cardId ?? photo.key), `${photo.key} wird nicht verwendet`);
  assert.equal(new Set(credits.photos.map((photo) => photo.photoId)).size, credits.photos.length, 'kein Foto doppelt');
});

test('Nachweise sind vollständig: Quelle, Fotograf, Lizenz, Link und APA 7', () => {
  for (const photo of credits.photos) {
    const name = photo.key;
    assert.equal(photo.source, 'Unsplash', name);
    assert.equal(photo.license, 'Unsplash License', name);
    assert.equal(photo.licenseUrl, 'https://unsplash.com/license', name);
    assert.ok(photo.photographer?.trim(), `${name}: Fotograf`);
    assert.match(photo.photographerUrl, /^https:\/\/unsplash\.com\/@/, `${name}: Profil`);
    assert.match(photo.url, /^https:\/\/unsplash\.com\/photos\//, `${name}: Link zum Foto`);
    assert.match(photo.published, /^\d{4}-\d{2}-\d{2}$/, `${name}: Datum`);
    assert.ok(photo.title?.trim(), `${name}: Titel`);
    assert.ok(photo.apa.includes(`(${photo.published.slice(0, 4)})`), `${name}: APA mit Jahr`);
    assert.ok(photo.apa.includes('[Foto]') && photo.apa.includes('Unsplash.') && photo.apa.endsWith(photo.url), `${name}: APA-Form`);
    assert.ok(photo.focusX >= 0 && photo.focusX <= 1 && photo.focusY >= 0 && photo.focusY <= 1, `${name}: Fokuspunkt`);
  }
});

test('Dateien liegen lokal im Repo, im gleichen Seitenverhältnis 4:3 und nicht zu gross', () => {
  for (const photo of credits.photos) {
    for (const [file, width] of [[photo.file, photo.width], [photo.thumb, photo.thumbWidth]]) {
      const path = imagePath(file);
      assert.ok(existsSync(path), `${file} fehlt`);
      const buffer = readFileSync(path);
      assert.equal(buffer.readUInt16BE(0), 0xffd8, `${file}: JPEG`);
      const size = jpegSize(buffer);
      assert.equal(size.width, width, `${file}: Breite`);
      assert.equal(size.width * 3, size.height * 4, `${file}: 4:3`);
      assert.ok(statSync(path).size < 400 * 1024, `${file}: unter 400 KB`);
    }
  }
});

test('Bildstil umschaltbar: mit „illustration“ zeigen die Karten die eigenen Illustrationen', async () => {
  const { allPhotos, photosForCard } = await import('../lib/images.js');
  const { IMAGE_STYLE } = await import('../config.js');
  const { indexCatalog } = await import('../logic/catalog.js');
  assert.equal(IMAGE_STYLE, 'photo', 'Standard: Fotos');
  assert.deepEqual(photosForCard('F01', 'photo').map((photo) => photo.file), ['F01.1.jpg', 'F01.2.jpg', 'F01.3.jpg'], 'Poulet, Rind, Schwein');
  assert.deepEqual(photosForCard('F01.2', 'photo').map((photo) => photo.file), ['F01.2.jpg']);
  assert.deepEqual(photosForCard('F07.2', 'photo'), [], 'ohne passendes Foto: Illustration');
  assert.deepEqual(photosForCard('F01', 'illustration'), []);
  // Jede Karte hat eine Illustration als Ersatz und eine Kartenfarbe; Untergruppen erben sie von ihrer Gruppe.
  const index = indexCatalog(cards);
  for (const card of index.cards.filter((entry) => entry.stage <= 2)) {
    assert.ok(card.illustration, `${card.id}: Illustration`);
    assert.ok(card.tint, `${card.id}: Kartenfarbe`);
  }
  assert.equal(index.get('F01.2').illustration, index.get('F01').illustration);
  // Bildnachweise nennen die Karten, auf denen ein Foto erscheint
  const chicken = allPhotos().find((photo) => photo.key === 'F01.1');
  assert.deepEqual(chicken.usedBy, ['F01.1', 'F01']);
  assert.deepEqual(allPhotos().find((photo) => photo.key === 'F03-a').usedBy, ['F03']);
});

test('Jedes Foto nennt, was es zeigt (Karten und sichtbare Lebensmittel)', () => {
  const ids = new Set(cards.map((card) => card.id));
  for (const photo of credits.photos) {
    assert.ok(photo.shows?.length > 0, `${photo.key}: shows`);
    for (const id of photo.shows) assert.ok(ids.has(id), `${photo.key}: ${id} gibt es nicht`);
    assert.ok(photo.foods?.length > 0, `${photo.key}: foods`);
  }
});

test('Bilder zeigen nie Ausgeschlossenes: Raster ohne das Beispiel, sonst die Illustration', async () => {
  const { allowedPhotos, photosForCard } = await import('../lib/images.js');
  const { indexCatalog } = await import('../logic/catalog.js');
  const { buildExclusions } = await import('../logic/filter.js');
  const { diets } = read('./stage0.json');
  const index = indexCatalog(cards);
  const shown = (cardId, entries, diet = null) =>
    allowedPhotos(photosForCard(cardId, 'photo'), { index, exclusions: buildExclusions(entries, { diet, diets, index }) }).map((photo) => photo.key);

  assert.deepEqual(shown('F01', []), ['F01.1', 'F01.2', 'F01.3'], 'ohne Ausschlüsse alle drei');
  assert.deepEqual(shown('F01', [{ type: 'card', value: 'F01.3' }]), ['F01.1', 'F01.2'], 'kein Schweinefleisch im Bild');
  assert.deepEqual(shown('F01', [], 'vegetarian'), [], 'vegetarisch: kein Fleischfoto');
  const almond = [{ type: 'allergen', value: 'almond' }];
  assert.deepEqual(shown('F13', almond), ['F13-b'], 'Mandelallergie: keine Mandeln im Bild');
  assert.deepEqual(shown('F13.1', almond), []);
  const tomato = [{ type: 'food', value: 'Tomate', freeText: true }];
  assert.deepEqual(shown('F10.2', tomato), [], 'eingetippte „Tomate“');
  assert.deepEqual(shown('F11', tomato), ['F11.1', 'F11.2']);
  assert.deepEqual(shown('F07', [{ type: 'allergen', value: 'wheat' }]), [], 'ohne Weizen keine Weizenpasta im Bild');
  // Ohne Filter (z. B. Vorschau) bleibt alles
  assert.equal(allowedPhotos(photosForCard('F01', 'photo'), null).length, 3);
});
