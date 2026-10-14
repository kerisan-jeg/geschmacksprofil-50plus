import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const credits = read('./image-credits.json');
const families = read('./catalog.json').cards.filter((card) => card.stage === 1);
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

test('Jede Familienkarte hat genau ein Foto', () => {
  assert.deepEqual(
    credits.photos.map((photo) => photo.cardId).sort(),
    families.map((card) => card.id).sort()
  );
});

test('Nachweise sind vollständig: Quelle, Fotograf, Lizenz, Link und APA 7', () => {
  for (const photo of credits.photos) {
    const name = photo.cardId;
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
  const { photoForCard } = await import('../lib/images.js');
  const { IMAGE_STYLE } = await import('../config.js');
  assert.equal(IMAGE_STYLE, 'photo', 'Standard: Fotos');
  assert.equal(photoForCard('F01', 'photo')?.file, 'F01.jpg');
  assert.equal(photoForCard('F01', 'illustration'), null);
  for (const card of families) assert.ok(card.illustration, `${card.id}: Illustration als Ersatz vorhanden`);
});
