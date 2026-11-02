// Explizite Abschlussmerkmale. `finished` in der Datenbank bleibt das ältere Befragungskennzeichen.
// Die App übergibt ihre Rundenübersicht; die Auswertung berechnet dieselbe Übersicht erneut aus den Antworten.
export const COMPLETION_VERSION = 1;
export const STUDY_ROUNDS = 4;

const validTime = (stamp) => typeof stamp === 'string' && Number.isFinite(Date.parse(stamp));
const number = (value) => typeof value === 'string' && value.startsWith('G') ? 4 : Number(value);

export function sessionCompletion(session, rounds = session.completion?.rounds ?? null) {
  const ends = (session.trace ?? []).filter((entry) => entry.type === 'round_end');
  const supplied = new Map((rounds ?? []).map((entry) => [entry.round, entry]));
  const states = Array.from({ length: STUDY_ROUNDS }, (_, index) => {
    const round = index + 1;
    const current = supplied.get(round);
    const end = ends.filter((entry) => number(entry.round) === round).at(-1);
    const answers = (session.events ?? []).filter((entry) => (entry.type ?? 'ANSWER') === 'ANSWER' && entry.response !== 'UNDO' && number(entry.round ?? 1) === round);
    return {
      round,
      status: current?.status ?? (end?.completed === true ? 'completed' : answers.length ? 'started' : 'open'),
      answered: current?.answered ?? end?.answered ?? answers.length,
      total: current?.total ?? null,
      empty: Boolean(current?.empty),
    };
  });
  const roundsCompleted = states.filter((entry) => entry.status === 'completed').length;
  const allRoundsCompleted = roundsCompleted === STUDY_ROUNDS;
  // Der erste vollständige Abschluss zählt. Spätere Besuche einer schon fertigen Runde
  // dürfen eine rechtzeitig abgeschickte Befragung nicht nachträglich als zu früh einstufen.
  // Für jede nichtleere Runde muss ein eigener Zeitnachweis vorhanden sein.
  const firstEnds = states.filter((entry) => !entry.empty).map((entry) =>
    ends.filter((end) => number(end.round) === entry.round && end.completed === true && validTime(end.at))
      .map((end) => end.at).sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null
  );
  const profileCompletedAt = allRoundsCompleted && firstEnds.length && firstEnds.every(Boolean)
    ? firstEnds.sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1)
    : null;
  const surveySubmitted = Boolean(session.survey?.submittedAt);
  const surveySubmittedAt = session.survey?.submittedAt ?? null;
  const surveyAfterProfileCompletion = surveySubmitted && allRoundsCompleted && validTime(surveySubmittedAt) && profileCompletedAt
    ? Date.parse(surveySubmittedAt) >= Date.parse(profileCompletedAt)
    : null;
  return {
    version: COMPLETION_VERSION,
    rounds: states,
    roundsCompleted,
    allRoundsCompleted,
    profileCompletedAt,
    surveySubmitted,
    surveySubmittedAt,
    surveyAfterProfileCompletion,
    studyCompleted: surveySubmitted && allRoundsCompleted ? surveyAfterProfileCompletion : false,
  };
}
