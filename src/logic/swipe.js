// Wischgesten als reine Funktionen, damit Schwelle und Rückfederung ohne Browser testbar sind.
// Die Werte (Schwellen, Geschwindigkeit) stehen in config.js unter SWIPE.
//
// Ablauf beim Ziehen:
//   swipeIntent()  → welche Antwort angedeutet wird und wie nah sie an der Schwelle ist (0 bis 1)
//   labelOpacity() → Deckkraft der Beschriftung auf der Karte, steigt mit der Zugdistanz
//   resolveRelease() beim Loslassen → Antwort oder null (dann springt die Karte zurück)

import { DISLIKE, LIKE, PREFER } from './answers.js';

// options.allowUp false (Runde 1 mit ?r1scale=2): Nach oben gibt es keine Antwort, die Karte springt zurück.
export function swipeIntent(dx, dy, swipe, { allowUp = true } = {}) {
  if (-dy > Math.abs(dx)) return allowUp ? { answer: PREFER, strength: Math.min(1, -dy / swipe.thresholdUp) } : null;
  if (dx > 0) return { answer: LIKE, strength: Math.min(1, dx / swipe.thresholdX) };
  if (dx < 0) return { answer: DISLIKE, strength: Math.min(1, -dx / swipe.thresholdX) };
  return null;
}

// Unter der Totzone bleibt die Beschriftung unsichtbar (kein Flackern bei kleinen Bewegungen),
// danach wächst sie gleichmässig bis zur vollen Deckkraft an der Schwelle.
export function labelOpacity(strength, swipe) {
  const dead = swipe.labelDeadZone;
  if (!(strength > dead)) return 0;
  return Math.min(1, (strength - dead) / (1 - dead));
}

// Ein schneller, kurzer Wisch zählt auch, wenn die Distanz noch nicht erreicht ist.
export function flingAnswer({ dx, dy, vx, vy }, swipe, { allowUp = true } = {}) {
  const { flingVelocity: v, flingMinDistance: d } = swipe;
  if (-dy > Math.abs(dx) && -dy > d && -vy > v) return allowUp ? PREFER : null;
  if (Math.abs(dx) > d && Math.abs(vx) > v && Math.sign(vx) === Math.sign(dx)) return dx > 0 ? LIKE : DISLIKE;
  return null;
}

// Entscheidung beim Loslassen: eine Antwort, wenn die Schwelle erreicht oder schnell geschnippt wurde.
// null heisst: unter der Schwelle, die Karte springt zurück (keine Fehlauslösung).
export function resolveRelease(motion, swipe, options = {}) {
  const fling = flingAnswer(motion, swipe, options);
  if (fling) return fling;
  const intent = swipeIntent(motion.dx, motion.dy, swipe, options);
  return intent && intent.strength >= 1 ? intent.answer : null;
}

// Geschwindigkeit (px pro ms) aus den Bewegungsproben der letzten windowMs Millisekunden.
// samples: [{ dx, dy, t }] in zeitlicher Reihenfolge.
export function releaseMotion(samples, windowMs = 120) {
  const last = samples.at(-1) ?? { dx: 0, dy: 0, t: 0 };
  const first = samples.find((sample) => last.t - sample.t < windowMs) ?? last;
  const dt = Math.max(1, last.t - first.t);
  return { dx: last.dx, dy: last.dy, vx: (last.dx - first.dx) / dt, vy: (last.dy - first.dy) / dt };
}
