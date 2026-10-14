import { ArrowRight, CircleCheck, Lock } from 'lucide-react';
import CreationSteps from '../components/CreationSteps.jsx';
import Avatar from '../components/Avatar.jsx';
import TopBar from '../components/TopBar.jsx';
import { ANSWER_META } from '../components/answerMeta.js';
import { computeProfile } from '../logic/engine.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { COMPLETE } from '../labels.js';

const ROWS = [PREFER, LIKE, DISLIKE, UNFAMILIAR, INTOLERANT];

// Abschluss nach jeder Runde: kurze Übersicht, dann „Weiter mit Runde 2“ (solange es Karten gibt)
// oder „Mein Profil ansehen“. Zahlen sind reine Zählungen der Antworten, keine Prozentwerte.
// nextTitles: Titel der Karten der nächsten Runde (leer, wenn alles beantwortet ist).
export default function CompleteScreen({ round, endedEarly, firstName, ruleCount, steps, nextTitles, onNextRound, onToProfile }) {
  const { groups, intolerant } = computeProfile(round);
  const counts = {
    [PREFER]: groups[PREFER].length,
    [LIKE]: groups[LIKE].length,
    [DISLIKE]: groups[DISLIKE].length,
    [UNFAMILIAR]: groups[UNFAMILIAR].length,
    [INTOLERANT]: intolerant.length,
  };
  const answered = round.roundSequence.length;
  const more = nextTitles.length > 0;
  let lead = COMPLETE.leadDone(answered);
  if (answered === 0) lead = COMPLETE.leadEmpty;
  else if (endedEarly) lead = COMPLETE.leadEnded(answered);

  return (
    <main className="screen screen-complete">
      <TopBar start={<CreationSteps steps={steps} />} end={<Avatar name={firstName} onClick={onToProfile} />} />

      <div className="stack">
        <p className="kicker">
          <CircleCheck aria-hidden="true" />
          {endedEarly ? COMPLETE.kickerEnded(round.round) : COMPLETE.kickerDone(round.round)}
        </p>
        <h1>{COMPLETE.title(firstName)}</h1>
        <p className="lead">{more ? lead : `${lead} ${COMPLETE.leadAllDone}`.trim()}</p>
      </div>

      {round.sequence.length > 0 && (
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
        <p className="fineprint">{more ? COMPLETE.nextHint(nextTitles.slice(0, 3)) : COMPLETE.profileHint}</p>
        {more && (
          <button type="button" className="button-primary" onClick={onNextRound}>
            {COMPLETE.nextRound(round.round + 1)}
            <ArrowRight aria-hidden="true" />
          </button>
        )}
        <button type="button" className={more ? 'button-secondary' : 'button-primary'} onClick={onToProfile}>
          {COMPLETE.toProfile}
          {!more && <ArrowRight aria-hidden="true" />}
        </button>
      </div>
    </main>
  );
}
