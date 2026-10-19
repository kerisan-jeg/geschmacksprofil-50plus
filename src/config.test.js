import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardLimit, DEFAULT_CONFIG, isAdminMode, normalizeConfig, resolveConfig } from './config.js';

const DEFAULTS = { roundCardLimit: 13, roundFlow: 'staged-v1', tutorial: false, imageStyle: 'photo', auth: true, sms: 'simulation', selection: 'adaptive', holdout: 6, r1scale: 3 };

test('Standard: 13 Karten für die 13 Familien, vier gestufte Runden, sechs Kontrollkarten', () => {
  assert.deepEqual(resolveConfig(''), DEFAULTS);
  assert.deepEqual(DEFAULT_CONFIG, DEFAULTS);
});

test('?limit wird übernommen', () => {
  assert.equal(resolveConfig('?limit=6').roundCardLimit, 6);
  assert.equal(resolveConfig('?limit=4').roundCardLimit, 4);
  assert.equal(resolveConfig('?limit=12').roundCardLimit, 12);
  assert.equal(resolveConfig('?limit=15').roundCardLimit, 15);
});

test('Ungültige Werte für ?limit fallen auf den Standard zurück', () => {
  for (const value of ['3', '16', '30', '31', '0', '-5', '7.5', 'abc', '', '1e1', '10px']) {
    assert.equal(resolveConfig(`?limit=${value}`).roundCardLimit, 13, value);
  }
});

test('Gespeicherte Konfigurationen und direkte Aufrufe überschreiten nie 15 Karten', () => {
  assert.equal(cardLimit({ roundCardLimit: 100 }), 15);
  assert.equal(normalizeConfig({ roundCardLimit: 30 }).roundCardLimit, 15);
  assert.equal(normalizeConfig({ roundCardLimit: 10 }).roundCardLimit, 13, 'alter Standard wird aktualisiert');
  assert.equal(normalizeConfig({ roundCardLimit: 10, roundFlow: 'staged-v1' }).roundCardLimit, 10, 'bewusst gewähltes neues Limit bleibt');
});

test('Alte ?tutorial-Parameter können das entfernte Tutorial nicht aktivieren', () => {
  for (const value of ['0', '1', 'nein']) {
    assert.equal(resolveConfig(`?tutorial=${value}`).tutorial, false);
  }
  assert.deepEqual(resolveConfig('?limit=8&tutorial=0'), { ...DEFAULTS, roundCardLimit: 8, ignoredParams: [{ name: 'tutorial', value: '0' }] });
});

test('?selection und ?holdout für den Vergleich im Pilot; ungültige Werte fallen auf den Standard zurück', () => {
  assert.equal(resolveConfig('?selection=fixed').selection, 'fixed');
  assert.equal(resolveConfig('?selection=adaptive').selection, 'adaptive');
  assert.equal(resolveConfig('?selection=zufall').selection, 'adaptive');
  assert.equal(resolveConfig('?holdout=0').holdout, 0);
  assert.equal(resolveConfig('?holdout=10').holdout, 10);
  for (const value of ['11', '-1', '2.5', 'viele', '']) assert.equal(resolveConfig(`?holdout=${value}`).holdout, 6, value);
  assert.deepEqual(resolveConfig('?selection=fixed&holdout=4&limit=8'), { ...DEFAULTS, selection: 'fixed', holdout: 4, roundCardLimit: 8 });
});

test('Admin-Ansicht nur mit ?admin=1', () => {
  assert.equal(isAdminMode('?admin=1'), true);
  assert.equal(isAdminMode('?admin=true'), false);
  assert.equal(isAdminMode(''), false);
});

test('Ignorierte Parameter werden festgehalten, damit stille Rückfälle auffallen', () => {
  assert.deepEqual(resolveConfig('?limit=30').ignoredParams, [{ name: 'limit', value: '30' }]);
  assert.equal(resolveConfig('?limit=30').roundCardLimit, 13);
  assert.deepEqual(resolveConfig('?limit=20&holdout=12&selection=zufall&sms=echt').ignoredParams.map((entry) => entry.name), ['limit', 'sms', 'selection', 'holdout']);
  assert.equal('ignoredParams' in resolveConfig('?limit=8&holdout=2'), false, 'nur wenn etwas ignoriert wurde');
});

test('?r1scale: 3 (Standard) oder 2; ungültige Werte fallen zurück und werden als ignoriert vermerkt', () => {
  assert.equal(resolveConfig('').r1scale, 3);
  assert.equal(resolveConfig('?r1scale=2').r1scale, 2);
  assert.equal(resolveConfig('?r1scale=3').r1scale, 3);
  for (const value of ['1', '4', 'zwei', '', '2.0']) {
    const config = resolveConfig(`?r1scale=${value}`);
    assert.equal(config.r1scale, 3, value);
    assert.deepEqual(config.ignoredParams, [{ name: 'r1scale', value }]);
  }
});
