import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, isAdminMode, resolveConfig } from './config.js';

test('Ohne Parameter gelten die Standardwerte (Limit 10, Tutorial an)', () => {
  assert.deepEqual(resolveConfig(''), { roundCardLimit: 10, tutorial: true });
  assert.deepEqual(DEFAULT_CONFIG, { roundCardLimit: 10, tutorial: true });
});

test('?limit wird übernommen', () => {
  assert.equal(resolveConfig('?limit=6').roundCardLimit, 6);
  assert.equal(resolveConfig('?limit=4').roundCardLimit, 4);
  assert.equal(resolveConfig('?limit=30').roundCardLimit, 30);
});

test('Ungültige Werte für ?limit fallen auf den Standard zurück', () => {
  for (const value of ['3', '31', '0', '-5', '7.5', 'abc', '', '1e1', '10px']) {
    assert.equal(resolveConfig(`?limit=${value}`).roundCardLimit, 10, value);
  }
});

test('?tutorial=0|1 schaltet das Mini-Tutorial, alles andere bleibt Standard', () => {
  assert.equal(resolveConfig('?tutorial=0').tutorial, false);
  assert.equal(resolveConfig('?tutorial=1').tutorial, true);
  assert.equal(resolveConfig('?tutorial=nein').tutorial, true);
  assert.deepEqual(resolveConfig('?limit=8&tutorial=0'), { roundCardLimit: 8, tutorial: false });
});

test('Admin-Ansicht nur mit ?admin=1', () => {
  assert.equal(isAdminMode('?admin=1'), true);
  assert.equal(isAdminMode('?admin=true'), false);
  assert.equal(isAdminMode(''), false);
});
