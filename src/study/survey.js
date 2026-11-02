// Gemeinsame Definition für Formular, Speicherung und Auswertung. Alte Fragefassungen bleiben lesbar.
export const SURVEY_VERSION = 'study-v2';
export const LEGACY_SURVEY_VERSION = 'legacy-v1';
export const NOT_TRIED = 'not_tried';

const options = (labels) => labels.map((label, index) => ({ id: index + 1, label }));
const ease = { id: 'ease', question: 'Wie einfach war die App insgesamt zu bedienen?', options: options(['Sehr schwierig', 'Eher schwierig', 'Mittel', 'Eher einfach', 'Sehr einfach']) };
const clarity = { id: 'clarity', question: 'Wie verständlich waren die Antwortmöglichkeiten?', options: options(['Gar nicht verständlich', 'Eher nicht verständlich', 'Teils, teils', 'Eher verständlich', 'Sehr verständlich']) };
const fit = { id: 'fit', question: 'Wie gut beschreibt das angezeigte Profil deinen Geschmack?', options: options(['Gar nicht', 'Eher nicht', 'Teils, teils', 'Eher gut', 'Sehr gut']) };
const length = { id: 'length', question: 'Wie empfandest du die Länge?', options: options(['Zu kurz', 'Gerade richtig', 'Zu lang']) };

export const SURVEY_SCALES = [
  ease,
  { id: 'swipeClarity', question: 'Wie verständlich war für dich das Bewerten durch Wischen?', options: [...clarity.options, { id: NOT_TRIED, label: 'Nicht ausprobiert / kann ich nicht beurteilen' }] },
  { id: 'effort', question: 'Wie anstrengend war es, die Fragen und Karten zu beantworten?', options: options(['Gar nicht anstrengend', 'Eher wenig anstrengend', 'Mittel', 'Eher anstrengend', 'Sehr anstrengend']) },
  { id: 'repetition', question: 'Wie häufig kamen dir Fragen oder Karten unnötig ähnlich oder wiederholt vor?', options: options(['Nie', 'Selten', 'Manchmal', 'Oft', 'Sehr oft']) },
  fit,
  length,
];
export const LEGACY_SURVEY_SCALES = [{ ...ease, question: 'Wie einfach war die Anwendung zu bedienen?' }, clarity, fit, length];

export function surveyVersion(survey) {
  if (!survey) return null;
  return survey.version ?? (['swipeClarity', 'effort', 'repetition'].some((id) => Object.hasOwn(survey, id)) ? SURVEY_VERSION : LEGACY_SURVEY_VERSION);
}

export function surveyScales(version) {
  return version === SURVEY_VERSION ? SURVEY_SCALES : version === LEGACY_SURVEY_VERSION ? LEGACY_SURVEY_SCALES : [];
}

export function surveyIssues(survey) {
  const scales = surveyScales(surveyVersion(survey));
  if (!scales.length) return ['unknown_version'];
  return scales.filter((scale) => !scale.options.some((option) => option.id === survey[scale.id])).map((scale) => scale.id);
}

export function submittedSurvey(values, now = new Date()) {
  const version = surveyVersion(values);
  const issues = surveyIssues(values);
  if (issues.length) throw new Error(`Ungültige Befragungsantworten: ${issues.join(', ')}`);
  return {
    version,
    ...Object.fromEntries(surveyScales(version).map(({ id }) => [id, values[id]])),
    remarks: String(values.remarks ?? '').trim().slice(0, 500) || null,
    submittedAt: now.toISOString(),
  };
}
