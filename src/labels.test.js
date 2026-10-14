import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAst } from 'vite';
import * as LABELS from './labels.js';
import { ANSWER_LABELS } from './labels.js';

// fileURLToPath statt URL.pathname: sonst entsteht unter Windows „C:\C:\…“.
const SRC = fileURLToPath(new URL('.', import.meta.url));

// Code ohne Kommentare: Kommentare dürfen die Begriffe zur Erklärung nennen.
function codeOf(file) {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

function filesIn(dir, accept) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' ? [] : filesIn(path, accept);
    return accept(path) ? [path] : [];
  });
}

const jsxFiles = () => filesIn(SRC, (path) => path.endsWith('.jsx'));
// Oberfläche: alle .jsx-Dateien und die .js-Dateien neben den Komponenten (ohne Tests)
const uiFiles = () => [
  ...jsxFiles(),
  ...filesIn(join(SRC, 'components'), (path) => path.endsWith('.js') && !path.endsWith('.test.js')),
  ...filesIn(join(SRC, 'app'), (path) => path.endsWith('.js') && !path.endsWith('.test.js')),
];

// Erlaubte Zeichenketten, die wie Wörter aussehen, aber keine sichtbaren Texte sind.
const ALLOWED = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Escape', 'Enter', 'Tab', 'K', 'de-CH']);

function looksLikeText(value) {
  const text = String(value).trim();
  if (!text || ALLOWED.has(text)) return false;
  if (/[äöüÄÖÜß„“«»–]/.test(text)) return true;
  return /\b[A-ZÄÖÜ][a-zäöüß]{2,}/.test(text) && (/\s/.test(text) || /^[A-ZÄÖÜ][a-zäöüß]+$/.test(text));
}

// Sucht im Syntaxbaum nach Text im JSX und nach Zeichenketten, die wie sichtbarer Text aussehen.
function hardCodedTexts(file) {
  const ast = parseAst(readFileSync(file, 'utf8'), { lang: 'jsx' });
  const found = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'JSXText' && /\p{L}/u.test(node.value)) found.push(node.value.trim());
    if (node.type === 'Literal' && typeof node.value === 'string' && looksLikeText(node.value)) found.push(node.value);
    if (node.type === 'TemplateElement' && looksLikeText(node.value.cooked ?? node.value.raw)) found.push(node.value.raw);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast);
  return found;
}

test('Die alten Begriffe erscheinen nirgends in der Oberfläche', () => {
  // Gross geschrieben wie in der Oberfläche; die internen Konstanten (DISLIKE) bleiben erlaubt.
  const forbidden = /\b(Dislike|Superlike|Super-Like|Eher ungern|Besonders gern)\b/;
  for (const file of [...jsxFiles(), join(SRC, 'labels.js')]) {
    const text = codeOf(file);
    assert.ok(!forbidden.test(text), `${file} enthält einen alten Begriff`);
  }
});

test('Antwortbegriffe stehen nur in labels.js, nie hart im JSX', () => {
  const files = jsxFiles();
  assert.ok(files.length > 20, 'JSX-Dateien gefunden');
  for (const file of files) {
    const text = codeOf(file);
    for (const label of Object.values(ANSWER_LABELS)) {
      assert.ok(!text.includes(label), `${file} enthält „${label}“`);
    }
  }
});

test('Alle sichtbaren Texte kommen aus labels.js: kein Text hart in Komponenten und Bildschirmen', () => {
  const problems = uiFiles().flatMap((file) => hardCodedTexts(file).map((text) => `${file.replace(SRC, '')}: „${text}“`));
  assert.deepEqual(problems, []);
});

test('Die Prüfung erkennt harte Texte (Gegenprobe)', () => {
  assert.equal(looksLikeText('Weiter'), true);
  assert.equal(looksLikeText('Bitte wähle eine Antwort aus.'), true);
  assert.equal(looksLikeText('button-primary is-strong'), false);
  assert.equal(looksLikeText('translate(130vw, 4vh) rotate(16deg)'), false);
  assert.equal(looksLikeText('ArrowLeft'), false);
});

test('Die neuen Begriffe sind gesetzt', () => {
  assert.deepEqual(ANSWER_LABELS, {
    DISLIKE: 'Mag ich nicht',
    LIKE: 'Mag ich',
    PREFER: 'Mag ich sehr',
    UNFAMILIAR: 'Kenne ich nicht',
    INTOLERANT: 'Vertrage ich nicht',
  });
});

test('labels.js: Schweizer Rechtschreibung (kein ß) und Du-Form (kein Sie)', () => {
  const strings = [];
  const collect = (value) => {
    if (typeof value === 'string') strings.push(value);
    else if (typeof value === 'function') strings.push(String(value));
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(LABELS);
  for (const text of strings) {
    assert.ok(!text.includes('ß'), `ß in „${text}“`);
    assert.ok(!/\b(Sie|Ihre?|Ihnen)\b/.test(text), `Sie-Form in „${text}“`);
  }
});
