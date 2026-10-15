import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PROFILE_PROGRESS } from '../config.js';
import { indexCatalog } from './catalog.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from './answers.js';
import { deriveRoundState } from './engine.js';
import { buildDashboard, dishesAvailable, profileProgress } from './dashboard.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const index = indexCatalog(read('../data/catalog.json').cards);
const { diets } = read('../data/stage0.json');
const NONE = { diet: null, exclusions: [], cardLabels: {} };
const state = (events, onboarding = NONE) => deriveRoundState({ index, onboarding, diets, events });
const answer = (cardId, response) => ({ cardId, response });
const families = index.cards.filter((card) => card.stage === 1).map((card) => card.id);

test('Profilstand: 0 % zu Beginn, Gruppen geben bis 35 Punkte, „Kenne ich nicht“ gibt keine', () => {
  assert.deepEqual(PROFILE_PROGRESS, { stage1: 35, stage2: 30, stage3: 35, stage3Target: 12 }, 'Entwurf 35/30/35 aus Anhang B2');
  assert.deepEqual(profileProgress(state([])), { percent: 0, points: { stage1: 0, stage2: 0, stage3: 0 }, stage: 0 });
  const all = families.map((id) => answer(id, LIKE));
  const afterFamilies = profileProgress(state(all));
  assert.equal(afterFamilies.points.stage1, 35);
  assert.equal(afterFamilies.stage, 1, 'Stufe 1 abgeschlossen');
  const unknown = profileProgress(state(families.map((id) => answer(id, id === 'F01' ? UNFAMILIAR : LIKE))));
  assert.ok(unknown.points.stage1 < 35, '„Kenne ich nicht“ ist keine Geschmacksantwort');
});

test('Profilstand: Kontraste und Ausnahmen geben Stufe-2-Punkte, konkrete Lebensmittel Stufe 3; der Wert sinkt nie', () => {
  const events = families.map((id) => answer(id, id === 'F05' ? DISLIKE : LIKE));
  const steps = [
    answer('F05.4', LIKE), // Ausnahme Sojaprodukte
    answer('F12.1', PREFER),
    answer('F12.4', DISLIKE), // Kontrast Obst: verschieden
    answer('F12.1.1', PREFER), // Erdbeeren
    answer('F05.4.1', LIKE), // Naturtofu
  ];
  let previous = profileProgress(state(events)).percent;
  for (const step of steps) {
    events.push(step);
    const current = profileProgress(state(events)).percent;
    assert.ok(current >= previous, `${step.cardId}: ${previous} → ${current}`);
    previous = current;
  }
  const result = profileProgress(state(events));
  assert.ok(result.points.stage2 > 0 && result.points.stage3 > 0);
  assert.equal(result.points.stage3, Math.round(((35 * 2) / 12) * 10) / 10);
  // Alle Zweige geklärt → Stufe 2 abgeschlossen
  const done = [...families.map((id) => answer(id, DISLIKE))];
  for (const family of index.cards.filter((card) => card.stage === 1 && card.exceptionCandidate)) done.push(answer(family.exceptionCandidate, DISLIKE));
  assert.equal(profileProgress(state(done)).stage, 2);
  assert.equal(profileProgress(state(done)).points.stage2, 30);
});

test('Profilstand: Ausgeschlossenes zählt nicht, vegan braucht keine Fleischkarten', () => {
  const vegan = { diet: 'vegan', exclusions: [], cardLabels: {} };
  const visible = families.filter((id) => !['F01', 'F02', 'F03', 'F04'].includes(id));
  assert.equal(profileProgress(state(visible.map((id) => answer(id, LIKE)), vegan)).points.stage1, 35);
});

test('Gerichte zählen nicht zum Profilstand (Anhang B2) und stehen getrennt im Dashboard', () => {
  const base = families.map((id) => answer(id, LIKE));
  const withDish = [...base, answer('D01', PREFER)];
  assert.equal(profileProgress(state(withDish)).percent, profileProgress(state(base)).percent);
  const board = buildDashboard(state(withDish));
  assert.deepEqual(board.dishes, [{ id: 'D01', rating: PREFER }]);
  assert.ok(!board.favorites.some((entry) => entry.id === 'D01'));
});

test('Dashboard: Favoriten nur aus konkreten Lebensmitteln, Gruppen getrennt, „Mag ich nicht“ mit Ausnahmen', () => {
  const events = [
    ...families.map((id) => answer(id, { F05: DISLIKE, F12: PREFER, F09: UNFAMILIAR }[id] ?? LIKE)),
    answer('F05.4', LIKE),
    answer('F05.4.1', PREFER),
    answer('F12.1', LIKE),
    answer('F12.1.1', LIKE),
  ];
  const board = buildDashboard(state(events));
  // B3.1: Naturtofu (Mag ich sehr) vor Erdbeeren (Mag ich); Eier sind eine Endkarte und zählen auch
  assert.deepEqual(board.favorites.slice(0, 2), [
    { id: 'F05.4.1', rating: PREFER },
    { id: 'F03', rating: LIKE },
  ]);
  assert.ok(board.favorites.some((entry) => entry.id === 'F12.1.1'));
  assert.ok(!board.favorites.some((entry) => entry.id === 'F12'), 'Obst ist eine Gruppe, kein Favorit');
  assert.equal(board.groups[0].id, 'F12', 'Gruppen „Mag ich sehr“ zuerst');
  const legumes = board.dislikes.find((entry) => entry.id === 'F05');
  assert.deepEqual(legumes.exceptions.map((entry) => entry.id), ['F05.4', 'F05.4.1']);
  assert.deepEqual(board.unfamiliar, ['F09']);
  assert.deepEqual(board.unasked, []);
  assert.deepEqual(buildDashboard(state([answer('F01', LIKE)])).unasked.length, 12, 'noch nie gefragt, getrennt von „Kenne ich nicht“');
});

test('Feinheiten: roh und gegart nur, wenn beide beantwortet sind und sich unterscheiden', () => {
  const base = families.map((id) => answer(id, LIKE));
  assert.deepEqual(buildDashboard(state([...base, answer('F10.3.1', DISLIKE)])).details, []);
  const details = buildDashboard(state([...base, answer('F10.3.1', DISLIKE), answer('F11.2.1', LIKE)])).details;
  assert.deepEqual(details, [{ rawId: 'F10.3.1', cookedId: 'F11.2.1', raw: DISLIKE, cooked: LIKE }]);
  assert.deepEqual(buildDashboard(state([...base, answer('F10.3.1', LIKE), answer('F11.2.1', LIKE)])).details, [], 'gleich: keine Feinheit');
});

test('Gerichte erst nach Stufe 2 oder am Ende der Profilerstellung (nurec Kap. 5)', () => {
  assert.equal(dishesAvailable(state([answer('F01', LIKE)]), { moreRounds: true }), false);
  assert.equal(dishesAvailable(state([answer('F01', LIKE)]), { moreRounds: false }), true, 'nach der letzten Runde immer möglich');
  const stage1 = state(families.map((id) => answer(id, LIKE)));
  assert.equal(dishesAvailable(stage1, { moreRounds: true }), false, 'Kontraste noch offen');
  assert.equal(dishesAvailable(stage1, { moreRounds: false }), true, 'keine weitere Runde mehr');
  const done = [...families.map((id) => answer(id, DISLIKE))];
  for (const family of index.cards.filter((card) => card.stage === 1 && card.exceptionCandidate)) done.push(answer(family.exceptionCandidate, DISLIKE));
  assert.equal(dishesAvailable(state(done), { moreRounds: true }), true, 'Stufe 2 abgeschlossen');
});
