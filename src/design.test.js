import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDuration } from './theme/motion.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const tokensCss = read('src/theme/tokens.css');
const styleFiles = readdirSync(join(ROOT, 'src/styles')).filter((name) => name.endsWith('.css'));

// Deklarationen ausserhalb von @media-Bedingungen (dort sind px-Grenzen erlaubt), ohne Kommentare.
function declarations(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/[;{}]/)
    .map((part) => part.trim())
    .filter((part) => /^[a-z-]+\s*:/.test(part) && !part.startsWith('@'));
}

function token(name) {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(tokensCss);
  return match?.[1].trim() ?? null;
}

test('Komponenten-CSS nutzt nur Tokens: keine Farben, Pixel-, rem- oder Zeitwerte hart', () => {
  assert.ok(styleFiles.length >= 4);
  const problems = [];
  for (const file of styleFiles) {
    for (const declaration of declarations(read(`src/styles/${file}`))) {
      const value = declaration.slice(declaration.indexOf(':') + 1);
      if (/#[0-9a-f]{3,8}\b/i.test(value)) problems.push(`${file}: Farbe in „${declaration}“`);
      if (/\b(rgb|rgba|hsl|hsla)\(/i.test(value)) problems.push(`${file}: Farbe in „${declaration}“`);
      if (/(^|[\s(,-])\d*\.?\d+(px|rem|em)\b/.test(value)) problems.push(`${file}: Länge in „${declaration}“`);
      if (/(^|[\s(,])\d*\.?\d+(ms|s)\b/.test(value)) problems.push(`${file}: Dauer in „${declaration}“`);
      if (/^\s*font-family/.test(declaration) && !/var\(--font-family\)/.test(value)) problems.push(`${file}: Schrift in „${declaration}“`);
    }
  }
  assert.deepEqual(problems, []);
});

test('Komponenten setzen keine Farben oder Schriften im JSX', () => {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, name.name);
      if (name.isDirectory()) walk(path);
      else if (name.name.endsWith('.jsx')) files.push(path);
    }
  };
  walk(join(ROOT, 'src'));
  for (const file of files) {
    const code = readFileSync(file, 'utf8');
    assert.ok(!/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i.test(code), `${file}: Farbwert im JSX`);
    assert.ok(!/fontFamily|strokeWidth=/.test(code), `${file}: Schrift oder Strichstärke im JSX statt in den Tokens`);
  }
});

test('Eine Schriftfamilie, Grundschrift 19 px, kleinster Text 18 px', () => {
  assert.match(token('--font-family'), /^'Atkinson Hyperlegible Next Variable'/);
  assert.equal(token('--font-size-root'), '118.75%');
  const rem = (value) => Number(value.replace('rem', '')) * 19;
  for (const name of ['--font-size-caption', '--font-size-body', '--font-size-lead', '--font-size-title-s']) {
    assert.ok(rem(token(name)) >= 18, `${name} ≥ 18 px`);
  }
  const main = read('src/main.jsx');
  assert.equal((main.match(/@fontsource/g) ?? []).length, 1, 'nur eine Schrift wird geladen');
});

test('Abstände folgen dem 8-pt-Raster (4 und 12 als Halbschritte)', () => {
  const spaces = [...tokensCss.matchAll(/--space-\d+:\s*(\d+)px/g)].map((match) => Number(match[1]));
  assert.ok(spaces.length >= 8);
  for (const value of spaces) assert.ok(value % 8 === 0 || value === 4 || value === 12, `${value}px`);
});

test('Hintergrund: warmes Off-White, auch in index.html und im Manifest (theme-color)', () => {
  const canvas = token('--color-canvas');
  assert.match(canvas, /^#[0-9a-f]{6}$/i);
  const html = read('index.html');
  assert.ok(html.includes(`name="theme-color" content="${canvas}"`), 'index.html theme-color');
  assert.ok(html.includes(`background:${canvas}`) || html.includes(`background: ${canvas}`), 'index.html: Hintergrund vor dem Laden');
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, canvas);
  assert.equal(manifest.background_color, canvas);
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
  assert.match(read('src/styles/base.css'), /body\s*{[^}]*background:\s*var\(--color-canvas\)/, 'body mit expliziter Hintergrundfarbe');
});

test('Weniger Bewegung: alle Dauern werden auf 0 gesetzt', () => {
  const reduced = tokensCss.slice(tokensCss.indexOf('prefers-reduced-motion'));
  const durations = [...tokensCss.matchAll(/(--duration-[a-z-]+):\s*([\d.]+m?s)/g)].map((match) => match[1]);
  for (const name of new Set(durations)) {
    if (name === '--duration-demo') continue; // Demo-Schleife wird stattdessen angehalten (animation: none)
    // Überblenden statt Nachrücken: nur bei reduzierter Bewegung gesetzt, keine Bewegung (Kartenwechsel sichtbar)
    if (name === '--duration-card-fade') {
      assert.match(tokensCss, /--duration-card-fade:\s*0ms/);
      assert.match(reduced, /--duration-card-fade:\s*\d+ms/);
      continue;
    }
    assert.match(reduced, new RegExp(`${name}:\\s*0ms`), name);
  }
  assert.equal(parseDuration('280ms'), 280);
  assert.equal(parseDuration('0.3s'), 300);
  assert.equal(parseDuration(''), 0);
});
