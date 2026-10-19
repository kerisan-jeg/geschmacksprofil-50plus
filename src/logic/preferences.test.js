import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PREFERENCE_MODEL } from '../config.js';
import { indexCatalog } from './catalog.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from './answers.js';
import { directScore, predictedRating, predictScores } from './preferences.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);

test('Direkte Bewertung: −1, +1, +2; „Kenne ich nicht“ und „Vertrage ich nicht“ sind kein Geschmack', () => {
  assert.deepEqual(PREFERENCE_MODEL.weights, { DISLIKE: -1, LIKE: 1, PREFER: 2 });
  assert.equal(directScore(DISLIKE), -1);
  assert.equal(directScore(LIKE), 1);
  assert.equal(directScore(PREFER), 2);
  for (const rating of [UNFAMILIAR, INTOLERANT, null, undefined]) assert.equal(directScore(rating), null, String(rating));
});

test('Vermutung: Untergruppen erben die Bewertung ihrer Gruppe, pro Stufe halbiert', () => {
  const predictions = predictScores(index, { F12: LIKE, F13: PREFER, 'F13.1': LIKE });
  assert.deepEqual(predictions.get('F12'), { score: 1, direct: true, basisId: 'F12' });
  assert.deepEqual(predictions.get('F12.1'), { score: 0.5, direct: false, basisId: 'F12' }, 'Obst „Mag ich“ → Beeren vermutlich');
  assert.deepEqual(predictions.get('F13.2'), { score: 1, direct: false, basisId: 'F13' });
  // Stufe 3 erbt von der nächsten bewerteten Karte: Baumnüsse (direkt) statt Nüsse und Samen
  assert.deepEqual(predictions.get('F13.1.1'), { score: 0.5, direct: false, basisId: 'F13.1' });
  assert.deepEqual(predictions.get('F13.2.1'), { score: 0.5, direct: false, basisId: 'F13' }, 'zwei Stufen: 2 × 0.5 × 0.5');
  // Ohne bewertete Gruppe keine Vermutung
  assert.equal(predictions.has('F01.1'), false);
});

test('„Kenne ich nicht“ gibt nichts weiter: Die Sorte erbt dann von der Gruppe darüber', () => {
  const predictions = predictScores(index, { F04: LIKE, 'F04.2': UNFAMILIAR, F02: UNFAMILIAR });
  assert.deepEqual(predictions.get('F04.2.1'), { score: 0.25, direct: false, basisId: 'F04' });
  assert.equal(predictions.has('F02.1'), false, 'Gruppe unbekannt: keine Vermutung für Fisch');
});

test('Richtung: „Mag ich“ oder „Mag ich nicht“, nie „Mag ich sehr“', () => {
  assert.equal(predictedRating(1), LIKE, 'auch die Kinder einer Gruppe „Mag ich sehr“ sind nur vermutlich gern');
  assert.equal(predictedRating(0.25), LIKE);
  assert.equal(predictedRating(-0.5), DISLIKE);
  assert.equal(predictedRating(0), null);
  assert.equal(predictedRating(null), null);
});

test('Die Richtung hängt nicht an den angenommenen Zahlen (ohne Geschwister)', () => {
  const ratings = { F01: DISLIKE, F02: PREFER, F04: LIKE, 'F04.2': DISLIKE, F12: LIKE, F13: PREFER, 'F13.1': DISLIKE };
  const directions = (model) => {
    const predictions = predictScores(index, ratings, model);
    return Object.fromEntries([...predictions].map(([id, prediction]) => [id, predictedRating(prediction.score)]));
  };
  const base = directions(PREFERENCE_MODEL);
  for (const inheritFactor of [0.25, 0.75, 1]) {
    for (const weights of [{ DISLIKE: -1, LIKE: 1, PREFER: 2 }, { DISLIKE: -2, LIKE: 1, PREFER: 3 }, { DISLIKE: -1, LIKE: 0.5, PREFER: 1 }]) {
      assert.deepEqual(directions({ ...PREFERENCE_MODEL, inheritFactor, weights }), base, `Faktor ${inheritFactor}, ${JSON.stringify(weights)}`);
    }
  }
});

test('Variante mit Geschwistern: bewertete Untergruppen können die Vermutung umdrehen', () => {
  const ratings = { F12: LIKE, 'F12.1': DISLIKE, 'F12.2': DISLIKE };
  const plain = predictScores(index, ratings);
  assert.equal(predictedRating(plain.get('F12.3').score), LIKE, 'Standard: nur die Gruppe zählt');
  const withSiblings = predictScores(index, ratings, { ...PREFERENCE_MODEL, siblingWeight: 1 });
  // (0.5 + 1 × (−0.5 − 0.5)) / (1 + 2) = −1/6
  assert.ok(Math.abs(withSiblings.get('F12.3').score + 1 / 6) < 1e-9);
  assert.equal(predictedRating(withSiblings.get('F12.3').score), DISLIKE);
  // Nur Geschwister, Gruppe nicht bewertet: Mittelwert, eine Stufe abgeschwächt
  const siblingsOnly = predictScores(index, { 'F05.1': LIKE, 'F05.2': PREFER }, { ...PREFERENCE_MODEL, siblingWeight: 1 });
  assert.deepEqual(siblingsOnly.get('F05.3'), { score: 0.75, direct: false, basisId: 'F05' });
});

test('STAGE_WEIGHTS: Standard 1 auf allen Stufen (keine Wirkung); eigene Werte gewichten die Ebene der Bewertung', () => {
  assert.deepEqual(PREFERENCE_MODEL.stageWeights, { 1: 1, 2: 1, 3: 1, 4: 1 });
  assert.equal(directScore(LIKE, PREFERENCE_MODEL, 1), directScore(LIKE));
  const ratings = { F12: LIKE };
  const base = predictScores(index, ratings).get('F12.1.1').score;
  const weighted = predictScores(index, ratings, { ...PREFERENCE_MODEL, stageWeights: { 1: 0.5, 2: 1, 3: 1, 4: 1 } }).get('F12.1.1').score;
  // Doppelte Abschwächung: Gewicht der Stufe 1 mal inheritFactor pro Stufe (siehe Doku)
  assert.equal(weighted, base * 0.5);
  assert.equal(predictedRating(weighted), predictedRating(base), 'die Richtung bleibt');
});
