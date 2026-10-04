import { CircleHelp, Heart, ThumbsDown, ThumbsUp } from 'lucide-react';
import { ANSWER_LABELS } from '../config.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';

// Darstellung je Antwort: Beschriftung, Symbol, Farbton und Hinweis zur Geste.
export const ANSWER_META = {
  [DISLIKE]: { label: ANSWER_LABELS.DISLIKE, Icon: ThumbsDown, tone: 'dislike', hint: 'Nach links wischen oder tippen' },
  [LIKE]: { label: ANSWER_LABELS.LIKE, Icon: ThumbsUp, tone: 'like', hint: 'Nach rechts wischen oder tippen' },
  [PREFER]: { label: ANSWER_LABELS.PREFER, Icon: Heart, tone: 'prefer', hint: 'Nach oben wischen oder tippen' },
  [UNFAMILIAR]: { label: ANSWER_LABELS.UNFAMILIAR, Icon: CircleHelp, tone: 'unknown', hint: 'Tippen, wenn du es nicht kennst' },
};
