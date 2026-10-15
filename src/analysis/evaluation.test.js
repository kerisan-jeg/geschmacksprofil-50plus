import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexCatalog } from '../logic/catalog.js';
import { DISLIKE, LIKE, PREFER, UNDO, UNFAMILIAR } from '../logic/answers.js';
import { seededRandom } from '../logic/holdout.js';
import { SELECTION } from '../logic/selection.js';
import { simulateSession, tasteByFamily } from '../test/simulate.js';
import {
  bootstrapInterval,
  evaluate,
  firstSufficientK,
  formatSummary,
  learningCurve,
  majorityBaseline,
  othersBaseline,
  prepareSession,
  scoreAfter,
  sessionRows,
} from './evaluation.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const { diets } = read('../data/stage0.json');
const prepare = (session) => prepareSession(session, { index, diets });

const answer = (cardId, response, extra = {}) => ({ type: 'ANSWER', cardId, response, round: 1, ...extra });
const session = (sessionId, events, extra = {}) => ({ sessionId, config: { selection: 'adaptive', holdout: 2 }, onboarding: { diet: null, exclusions: [] }, events, ...extra });

const handmade = session('h1', [
  { type: 'HOLDOUT_DRAWN', cardIds: ['F12.3', 'F02.2'] },
  answer('F12', LIKE),
  answer('F01', PREFER),
  answer('F01', UNDO),
  answer('F02', DISLIKE),
  answer('F12.3', LIKE, { phase: 'holdout' }),
  answer('F02.2', LIKE, { phase: 'holdout' }),
]);

test('Aufbereitung: normale Auswahl nach Rückgängig, Kontrollkarten getrennt', () => {
  const data = prepare(handmade);
  assert.deepEqual(data.main, [
    { cardId: 'F12', response: LIKE },
    { cardId: 'F02', response: DISLIKE },
  ]);
  assert.deepEqual(data.checks, [
    { cardId: 'F12.3', response: LIKE },
    { cardId: 'F02.2', response: LIKE },
  ]);
  assert.equal(data.undos, 1);
  // Ohne HOLDOUT_DRAWN (z. B. gekürzter Export): Kontrollkarten aus phase
  const fallback = prepare({ ...handmade, events: handmade.events.slice(1) });
  assert.deepEqual(fallback.holdout, ['F12.3', 'F02.2']);
});

test('Lernkurve aus dem Protokoll: Was hätte die App nach k Antworten vermutet?', () => {
  const data = prepare(handmade);
  const none = scoreAfter(index, data, 0);
  assert.deepEqual([none.usable, none.predicted, none.correct], [2, 0, 0], 'ohne Antworten keine Vermutung');
  const one = scoreAfter(index, data, 1);
  assert.deepEqual([one.predicted, one.correct], [1, 1], 'nach Obst „Mag ich“: Steinobst richtig vermutet');
  const two = scoreAfter(index, data, 2);
  assert.deepEqual([two.predicted, two.correct], [2, 1], 'Krebstiere: vermutet „mag nicht“, tatsächlich „Mag ich“');
  assert.deepEqual(two.items[1], { cardId: 'F02.2', actual: LIKE, guess: DISLIKE, score: -0.5, basisId: 'F02', hit: false });
  assert.ok(two.completeness > one.completeness && one.completeness > none.completeness, 'Vollständigkeit wächst, Genauigkeit nicht');
});

test('„Kenne ich nicht“ bei einer Kontrollkarte ist keine Bewertung und zählt nicht zur Trefferquote', () => {
  const data = prepare(session('u1', [{ type: 'HOLDOUT_DRAWN', cardIds: ['F12.3'] }, answer('F12', LIKE), answer('F12.3', UNFAMILIAR, { phase: 'holdout' })]));
  assert.equal(scoreAfter(index, data, 1).usable, 0);
  assert.equal(learningCurve([data], { index, resamples: 50 })[0].sessions, 0, 'ohne bewertete Kontrollkarte nicht in der Kurve');
});

test('Vergleichswerte: „immer Mag ich“ und „andere Personen“ (ohne die Person selbst)', () => {
  const datas = [
    prepare(session('a', [{ type: 'HOLDOUT_DRAWN', cardIds: ['F12.3'] }, answer('F12.3', DISLIKE, { phase: 'holdout' })])),
    prepare(session('b', [answer('F12.3', DISLIKE)])),
    prepare(session('c', [answer('F12.3', DISLIKE), answer('F01', LIKE)])),
    prepare(session('d', [{ type: 'HOLDOUT_DRAWN', cardIds: ['F12.3'] }, answer('F12.3', LIKE, { phase: 'holdout' })])),
  ];
  assert.deepEqual(majorityBaseline(datas[0]), { usable: 1, predicted: 1, correct: 0 });
  const others = othersBaseline(datas);
  // a: die anderen sagen −1, −1, +1 → „mag nicht“ → richtig
  assert.deepEqual(others.get('a'), { usable: 1, predicted: 1, correct: 1 });
  // d: die anderen sagen −1, −1, −1 → „mag nicht“ → falsch
  assert.deepEqual(others.get('d'), { usable: 1, predicted: 1, correct: 0 });
});

test('Bootstrap-Intervall: wiederholbar, enthält den Mittelwert', () => {
  const values = [0.5, 0.75, 1, 0.25, 0.8, 0.6];
  const [low, high] = bootstrapInterval(values, { seed: 'x', resamples: 500 });
  assert.deepEqual(bootstrapInterval(values, { seed: 'x', resamples: 500 }), [low, high]);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  assert.ok(low < average && average < high);
  assert.deepEqual(bootstrapInterval([0.7]), [0.7, 0.7]);
  assert.deepEqual(bootstrapInterval([]), [null, null]);
});

// Simulierte Personen, deren Untergruppen immer wie ihre Gruppe bewertet werden: Das Modell trifft dann alles.
function consistentPeople(count, selection = SELECTION.ADAPTIVE) {
  const families = index.cards.filter((card) => card.stage === 1).map((card) => card.id);
  return Array.from({ length: count }, (_, i) => {
    const random = seededRandom(`person-${i}`);
    const byFamily = Object.fromEntries(families.map((id) => [id, random() < 0.35 ? DISLIKE : random() < 0.5 ? PREFER : LIKE]));
    return simulateSession({ index, diets, config: { roundCardLimit: 10, selection, holdout: 6 }, respond: tasteByFamily(index, byFamily), sessionId: `p${i}`, participantCode: `T${i}` });
  });
}

test('Simulation: Folgen die Untergruppen der Gruppe, erreicht das Modell 100 % und schlägt beide Vergleichswerte', () => {
  const result = evaluate(consistentPeople(12), { index, diets, resamples: 300 });
  const [adaptive] = result.curves;
  assert.equal(adaptive.selection, 'adaptive');
  assert.equal(adaptive.sessions, 12);
  const last = adaptive.curve.at(-1);
  assert.equal(last.accuracy, 1);
  assert.equal(adaptive.curve[0].accuracy, 0, 'vor der ersten Antwort keine Vermutung');
  assert.ok(adaptive.firstSufficientK !== null && adaptive.firstSufficientK <= 13, `ab k = ${adaptive.firstSufficientK}`);
  for (let i = 1; i < adaptive.curve.length; i += 1) {
    if (adaptive.curve[i].sessions === adaptive.curve[i - 1].sessions) {
      assert.ok(adaptive.curve[i].completeness >= adaptive.curve[i - 1].completeness - 1e-9, `Vollständigkeit bei k = ${i}`);
    }
  }
  assert.equal(result.checks.length, 12 * 6);
  assert.ok(result.checks.every((row) => row.hit === true));
  // Varianten ohne Geschwister liefern dieselbe Richtung (Annahmen ändern die Trefferquote nicht)
  const byId = Object.fromEntries(result.variants.map((variant) => [variant.id, variant.accuracy]));
  assert.equal(byId['factor-0.25'], byId.standard);
  assert.equal(byId['factor-1'], byId.standard);
  assert.equal(byId['dislike-2'], byId.standard);
  const text = formatSummary(result);
  assert.ok(text.includes('Lernkurve, adaptive Auswahl (12 Sitzungen)'));
  assert.ok(text.includes(`ab k = ${adaptive.firstSufficientK}`));
  const rows = sessionRows(index, result.datas);
  assert.ok(rows.every((row) => row.checksDrawn === 6 && row.accuracyAtEnd === 1 && row.rounds <= 4));
});

test('Feste und adaptive Auswahl werden getrennt ausgewertet; alte Sitzungen ohne Kontrollkarten stören nicht', () => {
  const sessions = [...consistentPeople(3), ...consistentPeople(2, SELECTION.FIXED).map((entry) => ({ ...entry, sessionId: `${entry.sessionId}-fest` })), session('alt', [answer('F01', LIKE)], { config: { roundCardLimit: 10 } })];
  const result = evaluate(sessions, { index, diets, resamples: 100 });
  assert.deepEqual(result.curves.map((curve) => [curve.selection, curve.sessions]), [['adaptive', 3], ['fixed', 3]]);
  assert.equal(result.curves[1].curve[0].sessions, 2, 'die alte Sitzung hat keine Kontrollkarten');
  assert.equal(firstSufficientK(result.curves[1].curve, { minSessions: 5 }), null, 'zu wenige Personen für ein Urteil');
});
