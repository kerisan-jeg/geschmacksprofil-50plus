import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const credits = read('./image-credits.json');
const cards = read('./catalog.json').cards;
const families = cards.filter((card) => card.stage === 1);
const subgroups = cards.filter((card) => card.stage === 2);
// Für diese Untergruppen gibt es kein passendes freies Foto: Sie bekommen ein Bild über Gemini (A15), bis dahin den Platzhalter.
const WITHOUT_PHOTO = ['F07.2', 'F07.3'];
const imagePath = (file) => fileURLToPath(new URL(`../../public/images/${file}`, import.meta.url));
const { indexCatalog } = await import('../logic/catalog.js');

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

test('Unsplash-Fotos: jede Untergruppe (ausser zwei) hat ein eigenes Foto, jedes Foto einen Nachweis', () => {
  // Die Rasterfotos der Gruppen (collages) bleiben als Nachweis erhalten; gezeigt werden sie seit dem
  // Teamentscheid vom 20.10.2026 nicht mehr (neutrales Symbol), einige zeigen aber ein konkretes Lebensmittel.
  const keys = new Set(credits.photos.map((photo) => photo.key));
  for (const [cardId, collage] of Object.entries(credits.collages)) {
    for (const key of collage) assert.ok(keys.has(key), `${cardId}: ${key} fehlt`);
  }
  const withPhoto = credits.photos.filter((photo) => photo.cardId).map((photo) => photo.cardId).sort();
  assert.deepEqual(withPhoto, subgroups.map((card) => card.id).filter((id) => !WITHOUT_PHOTO.includes(id)).sort());
  assert.equal(new Set(credits.photos.map((photo) => photo.photoId)).size, credits.photos.length, 'kein Foto doppelt');
});

test('Kartenbilder aus Unsplash (A15): Nachweis vorhanden, Bild zeigt genau diese Karte oder ihre Untergruppe', async () => {
  const { allPhotos } = await import('../lib/images.js');
  const byId = new Map(cards.map((card) => [card.id, card]));
  const byKey = new Map(credits.photos.map((photo) => [photo.key, photo]));
  const stock = cards.filter((card) => card.image?.source === 'stock');
  assert.equal(stock.length, 60, '34 Untergruppen und 26 Lebensmittel');
  for (const card of stock) {
    const photo = byKey.get(card.image.credit);
    assert.ok(photo, `${card.id}: Nachweis ${card.image.credit}`);
    assert.equal(card.image.license, photo.license, card.id);
    assert.deepEqual([card.image.shows, card.image.foods], [photo.shows, photo.foods], `${card.id}: zeigt dasselbe wie im Nachweis`);
    // Das Foto zeigt die Karte, eines ihrer Kinder, ihre Untergruppe oder eine Geschwisterkarte
    // (sonst würde es bei Ausschlüssen falsch gefiltert)
    const related = (id) => id === card.id || id === card.parentId || byId.get(id)?.parentId === card.id || byId.get(id)?.parentId === card.parentId;
    assert.ok(photo.shows.some(related), `${card.id}: ${photo.shows}`);
  }
  assert.ok(!cards.some((card) => card.stage === 1 && card.image), 'Gruppen: neutrales Symbol, kein Bild');
  // Bildnachweise nennen nur Fotos, die eine Karte zeigt, mit allen Karten
  const index = indexCatalog(cards);
  const salmon = allPhotos(index.cards).find((photo) => photo.key === 'F02.1');
  assert.deepEqual(salmon.usedBy, ['F02.1', 'F02.1.1'], 'Fisch und Lachs');
  assert.ok(!allPhotos(index.cards).some((photo) => photo.key === 'F03-a'), 'nur noch im Raster der Gruppe: nicht mehr gezeigt');
  // Gerichte behalten die eigene Illustration für den Bildstil „illustration“
  for (const dish of cards.filter((card) => card.stage === 4)) {
    assert.equal(dish.illustration, 'dish.svg', dish.id);
    assert.ok(existsSync(fileURLToPath(new URL(`../../public/illustrations/${dish.illustration}`, import.meta.url))), 'dish.svg');
  }
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
  const { allPhotos, cardVisual } = await import('../lib/images.js');
  const { IMAGE_STYLE } = await import('../config.js');
  const index = indexCatalog(cards);
  assert.equal(IMAGE_STYLE, 'photo', 'Standard: Bilder der Karten');
  const kind = (id, style) => cardVisual(index.get(id), { style });
  assert.deepEqual(kind('F01', 'photo'), { kind: 'neutral', source: 'own' }, 'Gruppe: neutrales Symbol');
  assert.deepEqual(kind('F01.2', 'photo'), { kind: 'image', src: '/cards/F01.2.webp', alt: index.get('F01.2').image.alt, source: 'stock' });
  assert.deepEqual(kind('F07.2', 'photo'), { kind: 'placeholder', source: null }, 'ohne Bild: Platzhalter');
  assert.deepEqual(kind('F01.2', 'illustration'), { kind: 'illustration', src: '/illustrations/F01.svg', source: 'own' });
  assert.equal(kind('F01', 'illustration').kind, 'neutral', 'Gruppen auch dann mit Symbol');
  // Jede Karte hat eine Illustration als Ersatz und eine Kartenfarbe; Untergruppen erben sie von ihrer Gruppe.
  for (const card of index.cards) {
    assert.ok(card.illustration, `${card.id}: Illustration`);
    assert.ok(card.tint, `${card.id}: Kartenfarbe`);
  }
  assert.equal(index.get('F01.2').illustration, index.get('F01').illustration);
  const chicken = allPhotos(index.cards).find((photo) => photo.key === 'F01.1');
  assert.deepEqual(chicken.usedBy, ['F01.1', 'F01.1.1'], 'Geflügel, Poulet');
});

test('Jedes Foto nennt, was es zeigt (Karten und sichtbare Lebensmittel)', () => {
  const ids = new Set(cards.map((card) => card.id));
  for (const photo of credits.photos) {
    assert.ok(photo.shows?.length > 0, `${photo.key}: shows`);
    for (const id of photo.shows) assert.ok(ids.has(id), `${photo.key}: ${id} gibt es nicht`);
    assert.ok(photo.foods?.length > 0, `${photo.key}: foods`);
  }
});

test('Bilder zeigen nie Ausgeschlossenes: sonst der neutrale Platzhalter', async () => {
  const { cardVisual, isImageAllowed } = await import('../lib/images.js');
  const { indexCatalog: catalogIndex } = await import('../logic/catalog.js');
  const { buildExclusions } = await import('../logic/filter.js');
  const { diets } = read('./stage0.json');
  const index = catalogIndex(cards);
  const allowed = (cardId, entries, diet = null) => isImageAllowed(index.get(cardId).image, { index, exclusions: buildExclusions(entries, { diet, diets, index }) });

  assert.equal(allowed('F01.1', []), true, 'ohne Ausschlüsse');
  assert.equal(allowed('F01.1', [], 'vegetarian'), false, 'vegetarisch: kein Fleischfoto');
  const almond = [{ type: 'allergen', value: 'almond' }];
  assert.equal(allowed('F13.1', almond), false, 'Mandelallergie: keine Mandeln im Bild');
  assert.equal(allowed('F13.2', almond), false, 'auch nicht neben Kürbiskernen');
  const tomato = [{ type: 'food', value: 'Tomate', freeText: true }];
  assert.equal(allowed('F10.2', tomato), false, 'eingetippte „Tomate“');
  assert.equal(allowed('F11.1', tomato), true);
  assert.equal(allowed('F07.1', [{ type: 'allergen', value: 'wheat' }]), false, 'ohne Weizen keine Weizenpasta im Bild');
  // Statt des Bildes der Platzhalter, mit der Quelle des nicht gezeigten Bildes für das Protokoll
  const filter = { index, exclusions: buildExclusions(tomato, { index }) };
  assert.deepEqual(cardVisual(index.get('F10.2'), { style: 'photo', filter }), { kind: 'placeholder', source: 'stock' });
  // Ohne Filter (z. B. Vorschau) bleibt alles
  assert.equal(isImageAllowed(index.get('F10.2').image, null), true);
});

test('Ohne Meeresfrüchte bleiben Fischbilder; die gemischte Ersatzillustration entfällt', async () => {
  const { illustrationForCard, isImageAllowed } = await import('../lib/images.js');
  const { indexCatalog: catalogIndex } = await import('../logic/catalog.js');
  const { buildExclusions } = await import('../logic/filter.js');
  const index = catalogIndex(cards);
  const filter = { index, exclusions: buildExclusions([{ type: 'animalOrigin', value: 'seafood' }], { index }) };
  for (const id of ['F02.1', 'F02.1.1']) {
    assert.equal(isImageAllowed(index.get(id).image, filter), true, `${id}: Lachs bleibt`);
    assert.equal(illustrationForCard(index.get(id), filter), null, `${id}: kein Fisch-mit-Garnele-Platzhalter`);
    assert.equal(illustrationForCard(index.get(id), null), 'F02.svg', 'ohne Ausschlüsse ursprüngliche Illustration');
  }
  assert.equal(isImageAllowed(index.get('F02.2').image, filter), false, 'Garnelen nicht');
  assert.equal(illustrationForCard(index.get('F12'), filter), 'F12.svg', 'unbetroffene Gruppe behält Illustration');
  const noFish = { index, exclusions: buildExclusions([{ type: 'allergen', value: 'fish' }], { index }) };
  assert.equal(isImageAllowed(index.get('F02.2').image, noFish), true);
  assert.equal(illustrationForCard(index.get('F02.2'), noFish), null, 'umgekehrt kein Fisch im Platzhalter für Krebstiere');
});
