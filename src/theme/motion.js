// Bewegungsdauern für JavaScript, gelesen aus den Design-Tokens (src/theme/tokens.css).
// So nutzen CSS-Übergänge und Zeitsteuerung im Code dieselben Werte. Bei „Weniger Bewegung“
// (prefers-reduced-motion) stehen die Tokens auf 0 ms, und der Code wartet nicht.

export function parseDuration(value) {
  const match = /^(-?\d*\.?\d+)(ms|s)$/.exec(String(value ?? '').trim());
  if (!match) return 0;
  return Number(match[1]) * (match[2] === 's' ? 1000 : 1);
}

// Ohne Browser (Tests) oder ohne geladene Tokens: 0 ms, also sofort.
export function readDuration(name) {
  try {
    const root = globalThis.document?.documentElement;
    if (!root || typeof globalThis.getComputedStyle !== 'function') return 0;
    return parseDuration(globalThis.getComputedStyle(root).getPropertyValue(name));
  } catch {
    return 0;
  }
}
