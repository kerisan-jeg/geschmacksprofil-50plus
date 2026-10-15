// Kontrollkarten (Messkonzept, docs/messkonzept.md). Reine Funktionen.
//
// Nach „Stimmt so“ werden pro Person einige Untergruppen (Stufe 2) zufällig zurückgehalten. Sie kommen nie in
// der Kartenauswahl vor, sondern erst am Ende der letzten Runde (engine.js). Ihre Antworten sind der
// Massstab dafür, ob die Vermutungen der App stimmen.
//
// - Vorher und zufällig gezogen, nicht nach der Vermutung der App: Sonst würden nur einfache Fälle geprüft.
// - Geschichtet: höchstens eine Karte pro Gruppe, solange Gruppen übrig sind (Obst, Fisch, Brot, …).
// - Nur, was nach Stufe 0 sichtbar ist (keine Kontrollkarte, die jemand ausgeschlossen hat).
// - Der Zufall kommt aus der sessionId: Die Auswahl lässt sich aus dem Protokoll nachrechnen.

import { isVisible } from './filter.js';

export const HOLDOUT_METHOD = 'stratified-random-v1';

// Zufallszahlen zwischen 0 und 1 aus einem Text (FNV-1a als Startwert, dann mulberry32).
export function seededRandom(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// state: aus deriveRoundState (Katalog und Ausschlüsse nach Stufe 0).
// Liefert { cardIds, method, eligible }; cardIds in der Reihenfolge, in der sie am Ende erscheinen.
export function drawHoldout(state, { count = 0, seed = '' } = {}) {
  const visible = (card) => isVisible(card, state.index, state.exclusions);
  const pools = state.index.cards
    .filter((card) => card.stage === 1 && visible(card))
    .map((family) => state.index.childrenOf(family.id).filter((child) => child.stage === 2 && visible(child)))
    .filter((pool) => pool.length > 0);
  const eligible = pools.reduce((sum, pool) => sum + pool.length, 0);
  if (!count || eligible === 0) return { cardIds: [], method: HOLDOUT_METHOD, eligible };

  const random = seededRandom(seed);
  const families = shuffled(
    pools.map((pool) => shuffled(pool, random)),
    random
  );
  const cardIds = [];
  const deepest = Math.max(...families.map((pool) => pool.length));
  for (let pass = 0; pass < deepest && cardIds.length < count; pass += 1) {
    for (const pool of families) {
      if (cardIds.length >= count) break;
      if (pool[pass]) cardIds.push(pool[pass].id);
    }
  }
  return { cardIds, method: HOLDOUT_METHOD, eligible };
}
