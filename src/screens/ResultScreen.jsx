import { Check, CircleDashed, Download, Lock, RotateCcw } from 'lucide-react';
import Artwork from '../components/Artwork.jsx';
import { ANSWER_META } from '../components/answerMeta.js';
import { buildProfile } from '../logic/engine.js';
import { DISLIKE, LIKE, PREFER, UNFAMILIAR, UNRATED } from '../logic/answers.js';
import { ANSWER_LABELS, ONBOARDING, RESULT } from '../labels.js';

const GROUPS = [
  { key: PREFER, ...ANSWER_META[PREFER] },
  { key: LIKE, ...ANSWER_META[LIKE] },
  { key: DISLIKE, ...ANSWER_META[DISLIKE], note: 'Kein Verbot: Ausnahmen fragen wir später gezielt nach.' },
  { key: UNFAMILIAR, ...ANSWER_META[UNFAMILIAR], label: RESULT.unfamiliar },
  { key: UNRATED, label: RESULT.unrated, Icon: CircleDashed, tone: 'open' },
];

export default function ResultScreen({ round, index, endedEarly, firstName, onboarding, onRestart, onDownloadLog }) {
  const profile = buildProfile(round);
  const toCards = (ids) => ids.map((id) => index.get(id));
  const groups = {
    [PREFER]: toCards(profile.taste[PREFER]),
    [LIKE]: toCards(profile.taste[LIKE]),
    [DISLIKE]: toCards(profile.taste[DISLIKE]),
    [UNFAMILIAR]: toCards(profile.unfamiliar),
    [UNRATED]: toCards(profile.unrated),
  };
  const answered = round.sequence.length;
  const shown = [...round.sequence, ...profile.unrated].map((id) => index.get(id));
  const credits = shown.filter((card) => card.image?.credit);
  // Feste Regeln: aus dem Onboarding und aus „Vertrage ich nicht“ beim Wischen.
  const ruleList = [
    ...onboarding.rules,
    ...round.swipeExclusions.map((entry) => ({ id: `swipe.${entry.value}`, text: `${index.get(entry.value).title} (${ANSWER_LABELS.INTOLERANT}, ${RESULT.fromSwipe})` })),
  ];
  const unsureTexts = onboarding.uncertain ? [ONBOARDING.unsureHint] : [];
  const thanks = firstName ? `Danke, ${firstName}. ` : '';

  return (
    <main className="screen screen-result">
      <p className="result-kicker">
        <Check aria-hidden="true" strokeWidth={2.6} />
        {endedEarly ? 'Runde beendet' : 'Runde 1 abgeschlossen'}
      </p>
      <h1>Dein Zwischenstand</h1>
      <p className="lead">
        {thanks}
        {endedEarly ? `${answered} Karten beantwortet.` : `Alle ${answered} Karten der Runde beantwortet.`} So hast du geantwortet:
      </p>

      <div className="result-panel">
        {GROUPS.filter(({ key }) => groups[key].length > 0).map(({ key, label, Icon, tone, note }) => (
          <section key={key} className={`result-group tone-${tone}`}>
            <h2>
              <span className="group-icon"><Icon aria-hidden="true" strokeWidth={2.2} /></span>
              {label}
              <span className="group-count">{groups[key].length}</span>
            </h2>
            <ul className="result-items">
              {groups[key].map((card) => (
                <li key={card.id}>
                  <Artwork card={card} className="thumb" />
                  <span>{card.title}</span>
                </li>
              ))}
            </ul>
            {note && <p className="note">{note}</p>}
          </section>
        ))}

        {(ruleList.length > 0 || unsureTexts.length > 0 || onboarding.freeTextNotes.length > 0) && (
          <section className="result-group tone-rule">
            <h2>
              <span className="group-icon"><Lock aria-hidden="true" strokeWidth={2.2} /></span>
              Feste Regeln
              {ruleList.length > 0 && <span className="group-count">{ruleList.length}</span>}
            </h2>
            {ruleList.length > 0 && (
              <ul className="rule-chips">
                {ruleList.map((rule) => <li key={rule.id}>{rule.text}</li>)}
              </ul>
            )}
            {onboarding.freeTextNotes.length > 0 && (
              <p className="note">
                Notizen: {onboarding.freeTextNotes.join(', ')}. {ONBOARDING.noteNotApplied}
              </p>
            )}
            {unsureTexts.map((text) => <p key={text} className="note">{text}</p>)}
            <p className="note">Aus deinen Angaben vor dem Start und beim Wischen. Diese Regeln stehen immer über dem Geschmack.</p>
          </section>
        )}
      </div>

      <p className="fineprint">
        Alles hier stammt direkt aus deinen Antworten. In den nächsten Runden fragen wir dort genauer nach, wo es sich lohnt.
      </p>

      <div className="screen-actions">
        <button type="button" className="button-primary" onClick={onRestart}>
          <RotateCcw aria-hidden="true" />
          Nochmals von vorn
        </button>
      </div>

      <footer className="test-lead">
        <p>Für die Testleitung</p>
        <button type="button" className="button-secondary" onClick={onDownloadLog}>
          <Download aria-hidden="true" />
          Protokoll herunterladen
        </button>
        {credits.length > 0 && (
          <details className="credits">
            <summary>Bildnachweise</summary>
            <ul>
              {credits.map((card) => (
                <li key={card.id}>
                  {card.title}: {card.image.credit.author}, {card.image.credit.source}, {card.image.credit.license}
                </li>
              ))}
            </ul>
          </details>
        )}
      </footer>
    </main>
  );
}
