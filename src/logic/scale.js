// Bewertungsbegriffe je Runde (Dozentenfeedback 19.10.2026, Verbesserung 3). Reine Funktionen.
// Gruppenkarten (Stufe 1) zeigen „Eher ungern / Eher gern / Sehr gern“ (r1-3) oder ohne „Sehr gern“ (r1-2),
// alle anderen Karten die Begriffe aus A3 (standard). Die Antwortwerte bleiben gleich (DISLIKE, LIKE, PREFER).

import { R1_SCALE, R1_SCALE_VALUES } from '../config.js';
import { ANSWER_LABELS, SCALE_LABELS } from '../labels.js';
import { DISLIKE, LIKE, PREFER } from './answers.js';

export const SCALE_VARIANTS = { R1_3: 'r1-3', R1_2: 'r1-2', STANDARD: 'standard' };

export function r1Scale(config = {}) {
  return R1_SCALE_VALUES.includes(config.r1scale) ? config.r1scale : R1_SCALE;
}

// Variante für eine Karte. Gruppen werden in Runde 1 gefragt; im Profil gilt für sie dieselbe Variante.
export function scaleVariant(card, config = {}) {
  if (card?.stage !== 1) return SCALE_VARIANTS.STANDARD;
  return r1Scale(config) === 2 ? SCALE_VARIANTS.R1_2 : SCALE_VARIANTS.R1_3;
}

// Bewertungen, die in dieser Variante wählbar sind (Reihenfolge wie die Knöpfe: links, Mitte, rechts).
export function scaleRatings(variant) {
  return variant === SCALE_VARIANTS.R1_2 ? [DISLIKE, LIKE] : [DISLIKE, PREFER, LIKE];
}

export function allowsPrefer(variant) {
  return scaleRatings(variant).includes(PREFER);
}

// Der angezeigte Begriff (labelShown). „Kenne ich nicht“ und „Vertrage ich nicht“ heissen überall gleich.
export function labelShown(variant, answer) {
  return SCALE_LABELS[variant]?.[answer] ?? ANSWER_LABELS[answer] ?? null;
}
