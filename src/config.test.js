import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, isAdminMode, resolveConfig } from './config.js';

const DEFAULTS = { roundCardLimit: 10, tutorial: false, imageStyle: 'photo', auth: true, sms: 'simulation', selection: 'adaptive', holdout: 6 };

test('Ohne Parameter gelten die Standardwerte (Limit 10, kein Tutorial, Fotos, Registrierung an, adaptive Auswahl, 6 Kontrollkarten)', () => {
  assert.deepEqual(resolveConfig(''), DEFAULTS);
  assert.deepEqual(DEFAULT_CONFIG, DEFAULTS);
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

test('Alte ?tutorial-Parameter können das entfernte Tutorial nicht aktivieren', () => {
  for (const value of ['0', '1', 'nein']) {
    assert.equal(resolveConfig(`?tutorial=${value}`).tutorial, false);
  }
  assert.deepEqual(resolveConfig('?limit=8&tutorial=0'), { ...DEFAULTS, roundCardLimit: 8 });
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
