import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ANSWER_LABELS } from './labels.js';

const SRC = new URL('.', import.meta.url).pathname;

// Code ohne Kommentare: Kommentare dürfen die Begriffe zur Erklärung nennen.
function codeOf(file) {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

function jsxFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return jsxFiles(path);
    return path.endsWith('.jsx') ? [path] : [];
  });
}

test('Die alten Begriffe erscheinen nirgends in der Oberfläche', () => {
  // Gross geschrieben wie in der Oberfläche; die internen Konstanten (DISLIKE) bleiben erlaubt.
  const forbidden = /\b(Dislike|Superlike|Super-Like|Eher ungern|Besonders gern)\b/;
  for (const file of [...jsxFiles(SRC), join(SRC, 'labels.js')]) {
    const text = codeOf(file);
    assert.ok(!forbidden.test(text), `${file} enthält einen alten Begriff`);
  }
});

test('Antwortbegriffe stehen nur in labels.js, nie hart im JSX', () => {
  for (const file of jsxFiles(SRC)) {
    const text = codeOf(file);
    for (const label of Object.values(ANSWER_LABELS)) {
      assert.ok(!text.includes(label), `${file} enthält „${label}“`);
    }
  }
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
