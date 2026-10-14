import { ArrowRight, CircleCheck, Lock } from 'lucide-react';
import CreationSteps from '../components/CreationSteps.jsx';
import { ANSWER_META } from '../components/answerMeta.js';
import { buildProfile } from '../logic/engine.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { COMPLETE } from '../labels.js';

const ROWS = [PREFER, LIKE, DISLIKE, UNFAMILIAR, INTOLERANT];

// Abschluss nach der Runde: kurze Übersicht und Weiterleitung zu „Mein Profil“.
// Zahlen sind reine Zählungen der Antworten, keine Prozentwerte und keine Berechnung.
export default function CompleteScreen({ round, endedEarly, firstName, ruleCount, steps, onToProfile }) {
  const profile = buildProfile(round);
  const counts = {
    [PREFER]: profile.taste[PREFER].length,
    [LIKE]: profile.taste[LIKE].length,
    [DISLIKE]: profile.taste[DISLIKE].length,
    [UNFAMILIAR]: profile.unfamiliar.length,
    [INTOLERANT]: profile.intolerant.length,
  };
  const answered = round.sequence.length;
  let lead = COMPLETE.leadDone(answered);
  if (answered === 0) lead = COMPLETE.leadEmpty;
  else if (endedEarly) lead = COMPLETE.leadEnded(answered);

  return (
    <main className="screen screen-complete">
      <CreationSteps steps={steps} />

      <div className="stack">
        <p className="kicker">
          <CircleCheck aria-hidden="true" />
          {endedEarly ? COMPLETE.kickerEnded : COMPLETE.kickerDone}
        </p>
        <h1>{COMPLETE.title(firstName)}</h1>
        <p className="lead">{lead}</p>
      </div>

      {answered > 0 && (
        <section className="panel" aria-labelledby="overview-title">
          <h2 id="overview-title" className="panel-title">
            {COMPLETE.overviewTitle}
          </h2>
          <ul className="count-list">
            {ROWS.filter((answer) => counts[answer] > 0).map((answer) => {
              const { Icon, label, tone } = ANSWER_META[answer];
              return (
                <li key={answer} className={`count-row tone-${tone}`}>
                  <span className="count-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="count-label">{label}</span>
                  <span className="count-value num">{counts[answer]}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {ruleCount > 0 && (
        <p className="note note-with-icon">
          <Lock aria-hidden="true" />
          {COMPLETE.rules(ruleCount)}
        </p>
      )}

      <div className="action-bar">
        <p className="fineprint">{COMPLETE.profileHint}</p>
        <button type="button" className="button-primary" onClick={onToProfile}>
          {COMPLETE.toProfile}
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}
