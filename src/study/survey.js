// Gemeinsame Definition für Formular, Speicherung und Auswertung. Alte Fragefassungen bleiben lesbar.
export const SURVEY_VERSION = 'study-v3';
export const PREVIOUS_SURVEY_VERSION = 'study-v2';
export const LEGACY_SURVEY_VERSION = 'legacy-v1';
export const NOT_TRIED = 'not_tried';
export const NOT_ASSESSABLE = 'not_assessable';
export const INSIGHT_FIELDS = ['insightsClarity', 'insightsFit'];
export const SURVEY_FIELD_IDS = ['ease', 'clarity', 'swipeClarity', 'effort', 'repetition', 'fit', 'length', 'insightsSeen', ...INSIGHT_FIELDS];

const options = (labels) => labels.map((label, index) => ({ id: index + 1, label }));
const ease = { id: 'ease', question: 'Wie einfach war die App insgesamt zu bedienen?', options: options(['Sehr schwierig', 'Eher schwierig', 'Mittel', 'Eher einfach', 'Sehr einfach']) };
const clarity = { id: 'clarity', question: 'Wie verständlich waren die Antwortmöglichkeiten?', options: options(['Gar nicht verständlich', 'Eher nicht verständlich', 'Teils, teils', 'Eher verständlich', 'Sehr verständlich']) };
const fit = { id: 'fit', question: 'Wie gut beschreibt das angezeigte Profil deinen Geschmack?', options: options(['Gar nicht', 'Eher nicht', 'Teils, teils', 'Eher gut', 'Sehr gut']) };
const length = { id: 'length', question: 'Wie empfandest du die Länge?', options: options(['Zu kurz', 'Gerade richtig', 'Zu lang']) };

export const PREVIOUS_SURVEY_SCALES = [
  ease,
  { id: 'swipeClarity', question: 'Wie verständlich war für dich das Bewerten durch Wischen?', options: [...clarity.options, { id: NOT_TRIED, label: 'Nicht ausprobiert / kann ich nicht beurteilen' }] },
  { id: 'effort', question: 'Wie anstrengend war es, die Fragen und Karten zu beantworten?', options: options(['Gar nicht anstrengend', 'Eher wenig anstrengend', 'Mittel', 'Eher anstrengend', 'Sehr anstrengend']) },
  { id: 'repetition', question: 'Wie häufig kamen dir Fragen oder Karten unnötig ähnlich oder wiederholt vor?', options: options(['Nie', 'Selten', 'Manchmal', 'Oft', 'Sehr oft']) },
  fit,
  length,
];
export const SURVEY_SCALES = [
  ...PREVIOUS_SURVEY_SCALES,
  { id: 'insightsSeen', question: 'Hast du dir unter «Weitere Einblicke» die Vermutungen der App angesehen?', options: [
    { id: 'yes', label: 'Ja' },
    { id: 'no', label: 'Nein' },
    { id: 'no_predictions', label: 'Dort wurden mir keine Vermutungen angezeigt' },
  ] },
  { id: 'insightsClarity', when: 'insightsSeen', equals: 'yes', question: 'Wie verständlich waren für dich die Begründungen zu den Vermutungen?', options: [...clarity.options, { id: NOT_ASSESSABLE, label: 'Kann ich nicht beurteilen' }] },
  { id: 'insightsFit', when: 'insightsSeen', equals: 'yes', question: 'Wie gut passen die Vermutungen unter «Weitere Einblicke» zu deinem Geschmack?', options: [...fit.options, { id: NOT_ASSESSABLE, label: 'Kann ich nicht beurteilen' }] },
];
export const LEGACY_SURVEY_SCALES = [{ ...ease, question: 'Wie einfach war die Anwendung zu bedienen?' }, clarity, fit, length];

export function surveyVersion(survey) {
  if (!survey) return null;
  return survey.version ?? (['insightsSeen', ...INSIGHT_FIELDS].some((id) => Object.hasOwn(survey, id)) ? SURVEY_VERSION
    : ['swipeClarity', 'effort', 'repetition'].some((id) => Object.hasOwn(survey, id)) ? PREVIOUS_SURVEY_VERSION : LEGACY_SURVEY_VERSION);
}

export function surveyScales(version) {
  return version === SURVEY_VERSION ? SURVEY_SCALES : version === PREVIOUS_SURVEY_VERSION ? PREVIOUS_SURVEY_SCALES : version === LEGACY_SURVEY_VERSION ? LEGACY_SURVEY_SCALES : [];
}

export function surveyQuestionApplies(scale, values) {
  return !scale.when || values?.[scale.when] === scale.equals;
}

export function activeSurveyScales(values, version = surveyVersion(values)) {
  return surveyScales(version).filter((scale) => surveyQuestionApplies(scale, values));
}

export function surveyIssues(survey) {
  const scales = surveyScales(surveyVersion(survey));
  if (!scales.length) return ['unknown_version'];
  return scales.filter((scale) => surveyQuestionApplies(scale, survey) && !scale.options.some((option) => option.id === survey[scale.id])).map((scale) => scale.id);
}

export function submittedSurvey(values, now = new Date()) {
  const version = surveyVersion(values);
  const issues = surveyIssues(values);
  if (issues.length) throw new Error(`Ungültige Befragungsantworten: ${issues.join(', ')}`);
  return {
    version,
    ...Object.fromEntries(surveyScales(version).map((scale) => [scale.id, surveyQuestionApplies(scale, values) ? values[scale.id] : null])),
    remarks: String(values.remarks ?? '').trim().slice(0, 500) || null,
    submittedAt: now.toISOString(),
  };
}
