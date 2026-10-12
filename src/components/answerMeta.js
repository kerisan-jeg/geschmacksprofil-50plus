import { Ban, CircleHelp, Heart, ThumbsDown, ThumbsUp } from 'lucide-react';
import { ANSWER_HINTS, ANSWER_LABELS } from '../labels.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';

// Darstellung je Antwort: Beschriftung, Symbol, Farbton und Hinweis zur Geste.
// Texte kommen ausschliesslich aus labels.js.
export const ANSWER_META = {
  [DISLIKE]: { label: ANSWER_LABELS.DISLIKE, Icon: ThumbsDown, tone: 'dislike', hint: ANSWER_HINTS.DISLIKE },
  [LIKE]: { label: ANSWER_LABELS.LIKE, Icon: ThumbsUp, tone: 'like', hint: ANSWER_HINTS.LIKE },
  [PREFER]: { label: ANSWER_LABELS.PREFER, Icon: Heart, tone: 'prefer', hint: ANSWER_HINTS.PREFER },
  [UNFAMILIAR]: { label: ANSWER_LABELS.UNFAMILIAR, Icon: CircleHelp, tone: 'unknown', hint: ANSWER_HINTS.UNFAMILIAR },
  [INTOLERANT]: { label: ANSWER_LABELS.INTOLERANT, Icon: Ban, tone: 'intolerant', hint: ANSWER_HINTS.INTOLERANT },
};
