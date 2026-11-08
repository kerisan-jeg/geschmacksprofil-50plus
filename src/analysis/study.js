// Studienbericht: eine Zeile pro Sitzung, Befragungen einmal zählen und Fragefassungen getrennt halten.
import { replay } from '../logic/engine.js';
import { roundOverview } from '../logic/rounds.js';
import { eventType, ANSWER, PROFILE_EVENTS } from '../logic/events.js';
import { sessionCompletion } from '../study/completion.js';
import { LEGACY_SURVEY_VERSION, NOT_ASSESSABLE, NOT_TRIED, SURVEY_FIELD_IDS, SURVEY_VERSION, surveyIssues, surveyQuestionApplies, surveyScales, surveyVersion } from '../study/survey.js';

const timestamp = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const earliest = (values) => values.filter((value) => timestamp(value) !== null).sort((a, b) => timestamp(a) - timestamp(b))[0] ?? null;
const latest = (values) => values.filter((value) => timestamp(value) !== null).sort((a, b) => timestamp(b) - timestamp(a))[0] ?? null;
const elapsed = (start, end) => timestamp(start) !== null && timestamp(end) !== null && timestamp(end) >= timestamp(start) ? timestamp(end) - timestamp(start) : null;
const median = (values) => {
  const sorted = values.filter((value) => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b);
  return sorted.length ? sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : null;
};
const truth = (value) => value === null || value === undefined ? 'unbekannt' : value ? 'ja' : 'nein';
const roundNumber = (value) => typeof value === 'string' && value.startsWith('G') ? 4 : Number(value);
const ageEligible = (value) => ['50-59', '60-69', '70+', '70-79', '80+'].includes(value) ? true : value == null || value === '' ? null : false;

export function lastActivity(session) {
  return latest([session.survey?.submittedAt, session.endedAt, session.startedAt, ...(session.events ?? []).map((entry) => entry.timestamp), ...(session.trace ?? []).map((entry) => entry.at)]);
}

export function selectStudySessions(input, { exclude = [], excludeSessionIds = [], includeSetup = false } = {}) {
  const byId = new Map();
  let duplicates = 0;
  for (const session of input) {
    if (!session?.sessionId) continue;
    const previous = byId.get(session.sessionId);
    if (previous) duplicates += 1;
    const newer = timestamp(lastActivity(session)) ?? -Infinity;
    const older = previous ? timestamp(lastActivity(previous)) ?? -Infinity : -Infinity;
    const richness = (s) => (s.events?.length ?? 0) + (s.trace?.length ?? 0) + (s.survey?.submittedAt ? 1 : 0);
    if (!previous || newer > older || (newer === older && richness(session) >= richness(previous))) byId.set(session.sessionId, session);
  }
  const unique = [...byId.values()];
  const sessions = unique.filter((session) =>
    !exclude.includes(session.participantCode ?? '') &&
    !excludeSessionIds.includes(session.sessionId) &&
    (includeSetup || (session.participantCode !== 'SETUP_CHECK' && session.appVersion !== 'setup-check'))
  );
  return { sessions, duplicates, unique: unique.length, excluded: unique.length - sessions.length };
}

export function completionText(completion, cardsAnswered) {
  if (completion.studyCompleted === true) return 'Runden und Befragung abgeschlossen';
  if (completion.allRoundsCompleted && completion.surveySubmitted) return completion.studyCompleted === null ? 'Runden und Befragung vorhanden, zeitliche Zuordnung unklar' : 'Befragung vor vollständigem Rundenabschluss';
  if (completion.surveySubmitted) return 'Befragung abgeschickt, Runden offen';
  if (completion.allRoundsCompleted) return 'Runden abgeschlossen, Befragung fehlt';
  return cardsAnswered ? 'Karten beantwortet, Ablauf offen' : 'Begonnen ohne Kartenantworten';
}

export function participantRows(sessions, { index, diets }) {
  return sessions.map((session) => {
    const events = session.events ?? [];
    const trace = session.trace ?? [];
    const played = replay(events);
    const validAnswers = played.sequence.map((id) => events[played.answeredAt[id]]);
    const rounds = session.onboarding ? roundOverview({ index, onboarding: session.onboarding, diets, events, config: session.config }) : null;
    const completion = sessionCompletion(session, rounds);
    const started = earliest(events.filter((entry) => entry.type === 'AUTH_STARTED').map((entry) => entry.timestamp));
    const consent = earliest(trace.filter((entry) => entry.type === 'about').map((entry) => entry.at));
    const firstAnswer = earliest(validAnswers.map((entry) => entry.timestamp));
    const usageStartedAt = started ?? consent ?? firstAnswer;
    const version = surveyVersion(session.survey) ?? session.surveyVersion ?? null;
    const issues = session.survey?.submittedAt ? surveyIssues(session.survey) : [];
    const methodCount = (method) => validAnswers.filter((entry) => entry.inputMethod === method).length;
    const knownMethods = ['swipe', 'button', 'link', 'keyboard'];
    const cutoff = timestamp(session.survey?.submittedAt) ?? Infinity;
    const insightOpens = trace.filter((entry) => entry.type === 'profile_insights_opened' && timestamp(entry.at) !== null && timestamp(entry.at) <= cutoff);
    const insightsTracked = session.insightsTrackingVersion === 1 || insightOpens.length > 0;
    const reviews = events.filter((entry) => entry.type === 'RATING_CHANGED' && entry.fromPrediction === true && timestamp(entry.timestamp) !== null && timestamp(entry.timestamp) <= cutoff);
    const row = {
      sessionId: session.sessionId,
      participantCode: session.participantCode ?? null,
      appVersion: session.appVersion ?? null,
      ageGroup: session.onboarding?.ageGroup ?? null,
      ageEligible: ageEligible(session.onboarding?.ageGroup),
      surveyVersion: version,
      currentSurveyVersion: version === SURVEY_VERSION,
      surveySubmitted: completion.surveySubmitted,
      surveyValid: completion.surveySubmitted ? issues.length === 0 : null,
      surveyIssues: issues.join('|'),
      roundsCompleted: completion.roundsCompleted,
      allRoundsCompleted: completion.allRoundsCompleted,
      studyCompleted: completion.studyCompleted,
      completionStatus: completionText(completion, played.sequence.length),
      cardsAnswered: played.sequence.length,
      answerActions: events.filter((entry) => eventType(entry) === ANSWER && entry.response !== 'UNDO').length,
      undoCount: events.filter((entry) => eventType(entry) === ANSWER && entry.response === 'UNDO').length,
      swipeCount: methodCount('swipe'),
      buttonCount: methodCount('button'),
      linkCount: methodCount('link'),
      keyboardCount: methodCount('keyboard'),
      unknownInputCount: validAnswers.filter((entry) => !knownMethods.includes(entry.inputMethod)).length,
      profileEdits: events.filter((entry) => PROFILE_EVENTS.includes(eventType(entry))).length,
      insightsTracked,
      insightsOpens: insightsTracked ? insightOpens.length : null,
      insightsOpensWithPredictions: insightsTracked ? insightOpens.filter((entry) => entry.availablePredictions > 0).length : null,
      insightsLastAvailable: insightOpens.at(-1)?.availablePredictions ?? null,
      predictionReviews: new Set(reviews.map((entry) => entry.cardId)).size,
      usageStartedAt,
      timeStartSource: started ? 'Startknopf' : consent ? 'Einwilligung' : firstAnswer ? 'erste Kartenantwort' : 'nicht erfasst',
      profileCompletedAt: completion.profileCompletedAt,
      surveySubmittedAt: completion.surveySubmittedAt,
      profileDurationMs: elapsed(usageStartedAt, completion.profileCompletedAt),
      totalDurationMs: elapsed(usageStartedAt, completion.surveySubmittedAt),
      medianAnswerMs: median(validAnswers.map((entry) => entry.responseTimeMs)),
      surveyRemarks: session.survey?.remarks ?? null,
    };
    for (const response of ['LIKE', 'PREFER', 'DISLIKE', 'UNFAMILIAR', 'INTOLERANT']) row[response] = validAnswers.filter((entry) => entry.response === response).length;
    for (const round of completion.rounds) {
      const start = earliest(trace.filter((entry) => entry.type === 'round_start' && roundNumber(entry.round) === round.round).map((entry) => entry.at));
      const end = latest(trace.filter((entry) => entry.type === 'round_end' && roundNumber(entry.round) === round.round).map((entry) => entry.at));
      row['round' + round.round + 'Status'] = round.empty ? 'ohne passende Karten' : { open: 'offen', started: 'begonnen', completed: 'abgeschlossen', unavailable: 'ohne passende Karten' }[round.status] ?? round.status;
      row['round' + round.round + 'Cards'] = round.answered;
      row['round' + round.round + 'DurationMs'] = elapsed(start, end);
    }
    const scales = surveyScales(version);
    for (const id of SURVEY_FIELD_IDS) {
      const scale = scales.find((item) => item.id === id);
      const value = session.survey?.[id];
      const option = scale?.options.find((entry) => entry.id === value);
      const applies = scale && surveyQuestionApplies(scale, session.survey);
      const filterKnown = !scale?.when || scales.find((entry) => entry.id === scale.when)?.options.some((entry) => entry.id === session.survey?.[scale.when]);
      row['survey_' + id] = option && applies ? value : null;
      row['survey_' + id + '_label'] = !scale ? 'nicht erhoben in dieser Fragefassung' : !filterKnown ? 'nicht bestimmbar (Sichtungsantwort fehlt oder ungültig)' : !applies ? 'nicht gefragt (Vermutungen nicht angesehen oder keine angezeigt)' : value == null ? 'fehlend' : option?.label ?? 'ungültiger Wert';
    }
    return row;
  });
}

export function surveyDistributions(sessions) {
  const submitted = sessions.filter((session) => session.survey?.submittedAt);
  const versions = [...new Set(submitted.map((session) => surveyVersion(session.survey)))];
  return versions.flatMap((version) => {
    const group = submitted.filter((session) => surveyVersion(session.survey) === version);
    return surveyScales(version).flatMap((scale) => {
      const filter = scale.when && surveyScales(version).find((entry) => entry.id === scale.when);
      const unresolved = filter ? group.filter((session) => !filter.options.some((option) => option.id === session.survey[filter.id])).length : 0;
      const applicable = group.filter((session) => surveyQuestionApplies(scale, session.survey));
      const values = applicable.map((session) => session.survey[scale.id]);
      const valid = values.filter((value) => scale.options.some((option) => option.id === value) && ![NOT_TRIED, NOT_ASSESSABLE].includes(value)).length;
      const notTried = values.filter((value) => value === NOT_TRIED && scale.options.some((option) => option.id === NOT_TRIED)).length;
      const notAssessed = values.filter((value) => value === NOT_ASSESSABLE && scale.options.some((option) => option.id === NOT_ASSESSABLE)).length;
      const missing = values.filter((value) => value == null).length;
      const invalid = values.length - valid - notTried - notAssessed - missing;
      return scale.options.map((option) => {
        const count = values.filter((value) => value === option.id).length;
        const share = ![NOT_TRIED, NOT_ASSESSABLE].includes(option.id) && valid ? count / valid : null;
        return { version, questionId: scale.id, question: scale.question, value: option.id, answer: option.label, count, basis: group.length, eligible: applicable.length, skipped: group.length - applicable.length - unresolved, unresolved, valid, notTried, notAssessed, missing, invalid, share, percent: share === null ? null : Number((share * 100).toFixed(1)) };
      });
    });
  });
}

const column = (key, label) => ({ key, label });
export const PARTICIPANT_COLUMNS = [
  column('sessionId', 'Teilnahmenummer'), column('participantCode', 'Team-Kennung'), column('appVersion', 'App-Version'), column('ageGroup', 'Altersgruppe'), column('ageEligible', 'Zielgruppe ab 50'), column('currentSurveyVersion', 'Aktuelle Fragebogenfassung'),
  column('completionStatus', 'Abschlussstatus'), column('surveySubmitted', 'Befragung abgeschickt'), column('surveyValid', 'Befragungswerte vollständig und gültig'), column('roundsCompleted', 'Abgeschlossene Runden'), column('allRoundsCompleted', 'Alle Runden abgeschlossen'), column('studyCompleted', 'Runden vor Befragung vollständig abgeschlossen'),
  column('cardsAnswered', 'Gültig beantwortete Karten'), column('answerActions', 'Bewertungsaktionen'), column('undoCount', 'Rückgängig'), column('swipeCount', 'Wischantworten'), column('buttonCount', 'Antwortknöpfe'), column('linkCount', 'Vertrage-ich-nicht-Link'), column('keyboardCount', 'Tastaturantworten'), column('unknownInputCount', 'Eingabemethode unbekannt'),
  ...['LIKE', 'PREFER', 'DISLIKE', 'UNFAMILIAR', 'INTOLERANT'].map((key, index) => column(key, ['Mag ich / Eher gern', 'Mag ich sehr / Sehr gern', 'Mag ich nicht / Eher ungern', 'Kenne ich nicht', 'Vertrage ich nicht'][index])),
  column('profileEdits', 'Änderungen im Profil'), column('timeStartSource', 'Zeitbeginn ermittelt aus'), column('usageStartedAt', 'Beginn (ISO-Zeit)'), column('profileCompletedAt', 'Profil fertig (ISO-Zeit)'), column('surveySubmittedAt', 'Befragung abgeschickt (ISO-Zeit)'), column('profileDurationMs', 'Zeit bis alle Runden fertig (ms)'), column('totalDurationMs', 'Zeit bis Befragung abgeschickt (ms)'), column('medianAnswerMs', 'Mittlere Kartenantwortzeit Median (ms)'),
  column('insightsTracked', 'Erfassung des Öffnens verfügbar'), column('insightsOpens', 'Protokollierte Öffnungen bis Befragung'), column('insightsOpensWithPredictions', 'Davon mit verfügbaren Vermutungen'), column('insightsLastAvailable', 'Verfügbare Vermutungen bei letzter Öffnung'), column('predictionReviews', 'Freiwillig bewertete Vermutungskarten bis Befragung'),
  ...[1, 2, 3, 4].flatMap((round) => [column('round' + round + 'Status', 'Runde ' + round + ' Status'), column('round' + round + 'Cards', 'Runde ' + round + ' Karten'), column('round' + round + 'DurationMs', 'Runde ' + round + ' verstrichene Zeit (ms)')]),
];
export const SURVEY_COLUMNS = [
  column('sessionId', 'Teilnahmenummer'), column('surveyVersion', 'Fragebogen-Version'), column('surveySubmitted', 'Befragung abgeschickt'), column('surveySubmittedAt', 'Abgeschickt (ISO-Zeit)'), column('surveyValid', 'Werte vollständig und gültig'), column('surveyIssues', 'Fehlende oder ungültige Felder'),
  ...SURVEY_FIELD_IDS.flatMap((id) => [column('survey_' + id, id), column('survey_' + id + '_label', id + ' Antworttext')]),
  column('surveyRemarks', 'Anmerkung'),
];
export const DISTRIBUTION_COLUMNS = [column('version', 'Fragebogen-Version'), column('questionId', 'Fragenkennung'), column('question', 'Frage'), column('value', 'Antwortwert'), column('answer', 'Antwort'), column('count', 'Anzahl'), column('basis', 'Abgeschickte Befragungen dieser Fassung'), column('eligible', 'Für diese Frage vorgesehen'), column('skipped', 'Bedingt nicht gefragt'), column('unresolved', 'Filterantwort fehlt oder ungültig'), column('valid', 'Gültige Bewertungen'), column('notTried', 'Nicht ausprobiert'), column('notAssessed', 'Kann ich nicht beurteilen'), column('missing', 'Fehlend'), column('invalid', 'Ungültig'), column('percent', 'Anteil an gültigen Bewertungen (%)')];

export function studyCsv(rows, columns) {
  const cell = (value) => {
    let text = value == null ? '' : typeof value === 'boolean' ? truth(value) : typeof value === 'number' ? String(value).replace('.', ',') : String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return '\uFEFF' + [columns.map((entry) => cell(entry.label)).join(';'), ...rows.map((row) => columns.map((entry) => cell(row[entry.key])).join(';'))].join('\r\n') + '\r\n';
}

const timeText = (ms) => ms == null ? 'nicht ermittelbar' : (ms / 60000).toFixed(1).replace('.', ',') + ' min';
const percent = (value) => value == null ? 'nicht berechenbar' : Math.round(value * 100) + ' %';

export function formatStudySummary({ sessions, rows, distributions, selection }, technical) {
  const submitted = rows.filter((row) => row.surveySubmitted);
  const withCards = rows.filter((row) => row.cardsAnswered > 0);
  const completed = rows.filter((row) => row.studyCompleted === true);
  const eligible = completed.filter((row) => row.ageEligible === true && row.surveyValid === true);
  const target = eligible.filter((row) => row.currentSurveyVersion);
  const lines = [
    'Studienauswertung: Bedienung, Aufwand und Geschmacksprofil', '',
    'Datenbasis',
    `  Eindeutige Sitzungen im Export: ${selection.unique}; ausgeschlossene Tests/Kennungen/Teilnahmen: ${selection.excluded}.`,
    `  Zusammengeführte doppelte Sitzungseinträge: ${selection.duplicates}.`,
    `  Einbezogene Sitzungen: ${rows.length}; davon mit Kartenantworten: ${withCards.length}.`,
    `  Befragung abgeschickt: ${submitted.length}; ohne abgeschickte Befragung: ${rows.length - submitted.length}.`,
    `  Alle Runden abgeschlossen: ${rows.filter((row) => row.allRoundsCompleted).length}.`,
    `  Runden vor dem Abschicken der Befragung vollständig: ${completed.length}.`,
    `  Davon ab 50 mit gültiger Befragung, alle Fragefassungen: ${eligible.length}.`,
    `  Davon mit aktueller Fragefassung ${SURVEY_VERSION}: ${target.length}. Aufgabenstellung: mindestens 30 Personen ab 50.`,
    '  Eine Sitzung ist ein Durchlauf. Wiederholte Durchläufe derselben Person müssen im Team gekennzeichnet werden.', '',
    'Abschlussstatus',
  ];
  if (!rows.length) lines.push('  Keine einbezogenen Sitzungen vorhanden. Berichtsdateien enthalten keine alten Ergebniszeilen.');
  for (const status of [...new Set(rows.map((row) => row.completionStatus))]) lines.push(`  ${status}: ${rows.filter((row) => row.completionStatus === status).length}.`);
  lines.push('', 'Bedienung und Eingabemethoden',
    `  Sitzungen mit mindestens einer Wischantwort: ${rows.filter((row) => row.swipeCount > 0).length}.`,
    `  Sitzungen mit Antwortknöpfen: ${rows.filter((row) => row.buttonCount > 0).length}. Beides kann dieselbe Person sein.`,
    `  Gültige Kartenantworten: ${rows.reduce((sum, row) => sum + row.cardsAnswered, 0)}; davon Wischen ${rows.reduce((sum, row) => sum + row.swipeCount, 0)}, Knöpfe ${rows.reduce((sum, row) => sum + row.buttonCount, 0)}, Link ${rows.reduce((sum, row) => sum + row.linkCount, 0)}, Tastatur ${rows.reduce((sum, row) => sum + row.keyboardCount, 0)}, unbekannte Methode ${rows.reduce((sum, row) => sum + row.unknownInputCount, 0)}.`,
    '  Benötigte Hilfe und erfolglose Wischversuche werden nicht automatisch erkannt. Beobachtungen ergänzen.', '',
    'Aufwand und Zeiten',
    `  Karten pro Sitzung mit Kartenantworten (Median, n=${withCards.length}): ${median(withCards.map((row) => row.cardsAnswered)) ?? 'nicht ermittelbar'}.`,
    `  Karten bei vollständigem Studienablauf (Median, n=${completed.length}): ${median(completed.map((row) => row.cardsAnswered)) ?? 'nicht ermittelbar'}.`,
    `  Zeit bis zum vollständigen Rundenabschluss (Median, n=${rows.filter((row) => row.profileDurationMs !== null).length}): ${timeText(median(rows.map((row) => row.profileDurationMs)))}.`,
    `  Zeit bis zum Abschicken der Befragung (Median, n=${rows.filter((row) => row.totalDurationMs !== null).length}): ${timeText(median(rows.map((row) => row.totalDurationMs)))}.`,
    '  Zeiten beginnen am ersten Startknopf-Ereignis; ersatzweise bei der Einwilligung oder ersten Kartenantwort. Die Quelle steht in teilnahmen.csv.',
    '  Es sind verstrichene Zeiten einschliesslich Pausen. Fehlende oder widersprüchliche Zeitpunkte bleiben leer.',
    '  Rundenzeiten umfassen den ersten protokollierten Rundenstart bis zum letzten Rundenende, einschliesslich Kontrollkarten und Gerichten.', '',
    'Befragung: einmal pro abgeschickter Teilnahme, nach Fragefassung getrennt');
  for (const version of [...new Set(submitted.map((row) => row.surveyVersion))]) {
    lines.push(`  Fragefassung ${version}: ${submitted.filter((row) => row.surveyVersion === version).length} abgeschickte Befragungen.`);
    for (const scale of surveyScales(version)) {
      const entries = distributions.filter((entry) => entry.version === version && entry.questionId === scale.id);
      const first = entries[0];
      lines.push(`    ${scale.question}`);
      lines.push(`      Für diese Frage vorgesehen: ${first.eligible}; bedingt nicht gefragt: ${first.skipped}.`);
      if (first.unresolved) lines.push(`      Zuordnung wegen fehlender oder ungültiger Filterantwort unklar: ${first.unresolved}.`);
      lines.push(`      Gültig bewertet: ${first.valid}; nicht ausprobiert: ${first.notTried}; nicht beurteilbar: ${first.notAssessed}; fehlend: ${first.missing}; ungültig: ${first.invalid}.`);
      for (const entry of entries.filter((entry) => entry.count && ![NOT_TRIED, NOT_ASSESSABLE].includes(entry.value))) lines.push(`      ${entry.answer}: ${entry.count} von ${entry.valid} (${percent(entry.share)}).`);
      if (first.notTried) lines.push(`      Nicht ausprobiert: ${first.notTried}; zählt nicht als mittlere oder schlechte Bewertung.`);
      if (first.notAssessed) lines.push(`      Kann ich nicht beurteilen: ${first.notAssessed}; wird separat gezählt und nicht als Bewertung verrechnet.`);
    }
    if (!surveyScales(version).length) lines.push('    Unbekannte Fragefassung: Werte nicht mit bekannten Fassungen vermischt.');
    if (version === LEGACY_SURVEY_VERSION) lines.push('    Diese ältere Fassung erfragte Anstrengung, Wiederholung und Wischverständlichkeit noch nicht ausdrücklich.');
  }
  if (!submitted.some((row) => row.surveyVersion === SURVEY_VERSION)) lines.push(`  Für die aktuelle Befragung ${SURVEY_VERSION} liegen noch keine abgeschickten Antworten vor.`);
  lines.push(`  Freitextanmerkungen: ${submitted.filter((row) => row.surveyRemarks).length}; siehe befragung.csv. Inhaltlich im Team nach Themen ordnen.`,
    '  Die unterschiedlichen Bewertungsfragen und die Längenfrage werden nicht zu einer gemeinsamen Gesamtnote verrechnet.', '',
    'Weitere Einblicke: Sichtung und Rückmeldung',
    `  Laut Befragung angesehen: ${submitted.filter((row) => row.survey_insightsSeen === 'yes').length}; nicht angesehen: ${submitted.filter((row) => row.survey_insightsSeen === 'no').length}; keine Vermutungen angezeigt: ${submitted.filter((row) => row.survey_insightsSeen === 'no_predictions').length}.`,
    `  Sitzungen mit protokollierter Öffnung vor Befragungsende: ${rows.filter((row) => row.insightsOpens > 0).length}; davon mit verfügbaren Vermutungen: ${rows.filter((row) => row.insightsOpensWithPredictions > 0).length}.`,
    `  Sitzungen ohne Erfassung des Öffnens: ${rows.filter((row) => !row.insightsTracked).length}. Fehlende Erfassung bedeutet nicht, dass der Bereich nicht angesehen wurde.`,
    `  Freiwillig bewertete Vermutungskarten bis Befragungsende: ${rows.reduce((sum, row) => sum + row.predictionReviews, 0)}.`,
    '  Aufklappen belegt weder Lesen noch Verständnis. Selbstauskunft, Öffnungsprotokoll und die beiden gezielten Fragen werden getrennt betrachtet.',
    '  Freiwillige Bewertungen betreffen selbst ausgewählte Karten und liefern keine unabhängige Trefferquote aller Vermutungen.', '',
    'Profilpassung und technische Zusatzprüfung',
    '  Die Passungsfrage oben beschreibt das persönliche Empfinden. Kontrollkarten prüfen dagegen einzelne Vorhersagen.');
  const checkRows = technical?.datas.filter((data) => data.checks.some((check) => ['LIKE', 'PREFER', 'DISLIKE'].includes(check.response))) ?? [];
  lines.push(`  Sitzungen mit bewerteten Kontrollkarten: ${checkRows.length}.`);
  const comparisons = new Map();
  for (const check of technical?.checks ?? []) {
    if (typeof check.hit !== 'boolean') continue;
    if (!comparisons.has(check.selection)) comparisons.set(check.selection, new Map());
    const group = comparisons.get(check.selection);
    group.set(check.sessionId, [...(group.get(check.sessionId) ?? []), Number(check.hit)]);
  }
  for (const [selection, people] of comparisons) {
    const accuracies = [...people.values()].map((hits) => hits.reduce((sum, hit) => sum + hit, 0) / hits.length);
    const accuracy = accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length;
    lines.push(`  Mittlere Kontrolltrefferquote je Sitzung (${selection}): ${percent(accuracy)} (n=${people.size} Sitzungen). Jede Sitzung zählt gleich viel.`);
  }
  lines.push('  Die Kontrollmessung betrifft Untergruppen in Runde 2, nicht die Genauigkeit aller Gerichte oder des gesamten fertigen Profils.',
    checkRows.length < 2 || [...comparisons.values()].some((group) => group.size < 2) ? '  Mit weniger als zwei auswertbaren Sitzungen je Auswahlverfahren sind Unsicherheitsintervalle und Vergleiche mit anderen Personen nicht aussagekräftig.' : '  Vergleichswerte und Unsicherheiten stehen in kontrollkarten-zusammenfassung.txt; sie sind mit ihrer Datenbasis zu beurteilen.', '',
    'Dateien',
    '  teilnahmen.csv: eine Zeile je Sitzung, Abschluss, Eingabemethoden, Kartenanzahl und klar benannte Zeiten.',
    '  befragung.csv: eine Zeile je Sitzung, Antwortwerte und Antworttexte; fehlende Befragungen bleiben sichtbar.',
    '  befragung-zusammenfassung.csv: Antwortverteilungen mit gültiger Basis, fehlenden Werten und Nicht-ausprobiert-Kategorie.',
    '  kontrollkarten-zusammenfassung.txt, lernkurve.csv, kontrollkarten.csv, sitzungen.csv, varianten.csv: technische Zusatzanalyse.',
    '  Diese Auswertung bestätigt keine Anzahl tatsächlich unterschiedlicher Personen und ersetzt das Beobachtungsprotokoll nicht.');
  return lines.join('\n') + '\n';
}
