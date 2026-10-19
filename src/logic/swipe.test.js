import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SWIPE } from '../config.js';
import { DISLIKE, LIKE, PREFER } from './answers.js';
import { labelOpacity, releaseMotion, resolveRelease, swipeIntent } from './swipe.js';

const still = (dx, dy) => ({ dx, dy, vx: 0, vy: 0 });

test('Unter der Schwelle springt die Karte zurück (keine Antwort)', () => {
  assert.equal(resolveRelease(still(SWIPE.thresholdX - 1, 0), SWIPE), null);
  assert.equal(resolveRelease(still(-(SWIPE.thresholdX - 1), 0), SWIPE), null);
  assert.equal(resolveRelease(still(0, -(SWIPE.thresholdUp - 1)), SWIPE), null);
  assert.equal(resolveRelease(still(0, 0), SWIPE), null);
  // Nach unten gibt es keine Antwort
  assert.equal(resolveRelease(still(0, 300), SWIPE), null);
});

test('Ab der Schwelle zählt die Richtung: rechts Mag ich, links Mag ich nicht, oben Mag ich sehr', () => {
  assert.equal(resolveRelease(still(SWIPE.thresholdX, 0), SWIPE), LIKE);
  assert.equal(resolveRelease(still(-SWIPE.thresholdX, 0), SWIPE), DISLIKE);
  assert.equal(resolveRelease(still(0, -SWIPE.thresholdUp), SWIPE), PREFER);
  // Schräg nach oben zählt als oben, wenn die Bewegung nach oben überwiegt
  assert.equal(resolveRelease(still(40, -SWIPE.thresholdUp - 10), SWIPE), PREFER);
  assert.equal(resolveRelease(still(SWIPE.thresholdX + 20, -60), SWIPE), LIKE);
});

test('Schnelles Schnippen zählt auch vor der Schwelle, aber nicht bei winzigen Bewegungen', () => {
  const fast = SWIPE.flingVelocity + 0.2;
  assert.equal(resolveRelease({ dx: SWIPE.flingMinDistance + 4, dy: 0, vx: fast, vy: 0 }, SWIPE), LIKE);
  assert.equal(resolveRelease({ dx: -(SWIPE.flingMinDistance + 4), dy: 0, vx: -fast, vy: 0 }, SWIPE), DISLIKE);
  assert.equal(resolveRelease({ dx: 0, dy: -(SWIPE.flingMinDistance + 4), vx: 0, vy: -fast }, SWIPE), PREFER);
  // zu kurz: Fehlauslösung verhindern
  assert.equal(resolveRelease({ dx: SWIPE.flingMinDistance - 4, dy: 0, vx: fast, vy: 0 }, SWIPE), null);
  // Bewegung zurück zur Mitte: kein Schnippen
  assert.equal(resolveRelease({ dx: SWIPE.flingMinDistance + 20, dy: 0, vx: -fast, vy: 0 }, SWIPE), null);
});

test('Die Beschriftung auf der Karte wird mit der Zugdistanz deutlicher', () => {
  const opacities = [0, 10, 20, 40, 60, 80, 100, SWIPE.thresholdX, 200].map((dx) => labelOpacity(swipeIntent(dx, 0, SWIPE)?.strength ?? 0, SWIPE));
  for (let i = 1; i < opacities.length; i += 1) assert.ok(opacities[i] >= opacities[i - 1], `steigt bei Schritt ${i}`);
  assert.equal(opacities[0], 0, 'ohne Bewegung unsichtbar');
  assert.equal(labelOpacity(SWIPE.labelDeadZone, SWIPE), 0, 'in der Totzone unsichtbar');
  assert.equal(labelOpacity(1, SWIPE), 1, 'an der Schwelle voll sichtbar');
  assert.ok(labelOpacity(0.5, SWIPE) > 0 && labelOpacity(0.5, SWIPE) < 1);
});

test('swipeIntent nennt die angedeutete Antwort und ihre Stärke (0 bis 1)', () => {
  assert.deepEqual(swipeIntent(SWIPE.thresholdX / 2, 0, SWIPE), { answer: LIKE, strength: 0.5 });
  assert.deepEqual(swipeIntent(-SWIPE.thresholdX * 2, 0, SWIPE), { answer: DISLIKE, strength: 1 });
  assert.equal(swipeIntent(0, -SWIPE.thresholdUp, SWIPE).answer, PREFER);
  assert.equal(swipeIntent(0, 0, SWIPE), null);
});

test('releaseMotion berechnet die Geschwindigkeit aus den letzten Proben', () => {
  const motion = releaseMotion([
    { dx: 0, dy: 0, t: 0 },
    { dx: 10, dy: 0, t: 100 },
    { dx: 60, dy: -5, t: 200 },
  ]);
  assert.equal(motion.dx, 60);
  assert.equal(motion.dy, -5);
  assert.equal(motion.vx, 0.5);
  assert.equal(motion.vy, -0.05);
  assert.deepEqual(releaseMotion([]), { dx: 0, dy: 0, vx: 0, vy: 0 });
});

test('Ohne „Sehr gern“ (?r1scale=2): Wischen und Schnippen nach oben geben keine Antwort, die Karte springt zurück', () => {
  const noUp = { allowUp: false };
  assert.equal(swipeIntent(0, -200, SWIPE, noUp), null);
  assert.equal(resolveRelease(still(0, -200), SWIPE, noUp), null);
  assert.equal(resolveRelease({ dx: 0, dy: -60, vx: 0, vy: -2 }, SWIPE, noUp), null);
  assert.equal(resolveRelease(still(200, 0), SWIPE, noUp), LIKE, 'links und rechts bleiben gleich');
  assert.equal(resolveRelease(still(-200, 0), SWIPE, noUp), DISLIKE);
  assert.equal(resolveRelease(still(0, -200), SWIPE), PREFER, 'Standard unverändert');
});
