// Antworttypen gemäss nurec v0.2, Kap. 4.
// PREFER entspricht SUPERLIKE; ein einheitlicher Begriff ist noch festzulegen.

export const DISLIKE = 'DISLIKE';
export const LIKE = 'LIKE';
export const PREFER = 'PREFER';
export const UNFAMILIAR = 'UNFAMILIAR';

// Karte nie gezeigt oder nicht beantwortet. Keine Bewertung.
export const UNRATED = 'UNRATED';

export const ANSWER_ORDER = [PREFER, LIKE, DISLIKE, UNFAMILIAR];
