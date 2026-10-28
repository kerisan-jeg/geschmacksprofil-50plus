import { useContext } from 'react';
import { ArrowRight, CircleCheck, Lock } from 'lucide-react';
import CreationSteps from '../components/CreationSteps.jsx';
import Avatar from '../components/Avatar.jsx';
import ProfileStatus from '../components/ProfileStatus.jsx';
import RoundOverview from '../components/RoundOverview.jsx';
import TopBar from '../components/TopBar.jsx';
import { metaFor, ScaleConfigContext } from '../components/answerMeta.js';
import { scaleVariant, SCALE_VARIANTS } from '../logic/scale.js';
import { computeProfile } from '../logic/engine.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { COMPLETE, ROUNDS } from '../labels.js';

const ROWS = [PREFER, LIKE, DISLIKE, UNFAMILIAR, INTOLERANT];

// Abschluss nach jeder Runde (nurec v0.2, Kap. 3: „Kurze Runde beenden und Profilstand sichern“):
// kurze Übersicht, „Profil aufgebaut“ (Anhang B2), dann weiter, solange eine weitere Runde erlaubt ist, oder
// „Mein Profil ansehen“. Gerichte gehören zu Runde 4. Das Alltagsprofil gibt es seit dem 28.10.2026 nicht mehr.
// Zahlen sind reine Zählungen der Antworten; der Prozentwert ist ein Erfassungsgrad (siehe ProfileStatus).
// Runde 4 schliesst mit Gerichten ab. nextNumber berücksichtigt übersprungene leere Ebenen;
// nextTitles sind die Karten dieser nächsten Runde, leer nach dem endgültigen Abschluss.
export default function CompleteScreen({
  round,
  mode = 'main',
  progress,
  endedEarly,
  firstName,
  ruleCount,
  steps,
  nextTitles,
  nextNumber,
  rounds = null,
  onResumeRound,
  onNextRound,
  onToProfile,
}) {
  const dishMode = round.round === 4 || mode === 'dishes';
  // Nach Runde 1 (nur Gruppen) dieselben Begriffe wie in der Runde („Eher gern“), sonst die aus A3
  const scaleConfig = useContext(ScaleConfigContext);
  const variant = round.round === 1 ? scaleVariant({ stage: 1 }, scaleConfig) : SCALE_VARIANTS.STANDARD;
  const { groups, intolerant } = computeProfile(round);
  const inMode = (id) => (round.index.get(id)?.stage === 4) === dishMode;
  const counts = {
    [PREFER]: groups[PREFER].filter(inMode).length,
    [LIKE]: groups[LIKE].filter(inMode).length,
    [DISLIKE]: groups[DISLIKE].filter(inMode).length,
    [UNFAMILIAR]: groups[UNFAMILIAR].filter(inMode).length,
    [INTOLERANT]: intolerant.filter(inMode).length,
  };
  const answered = round.roundSequence.length;
  const more = nextTitles.length > 0;
  const finished = !more;
  let lead = COMPLETE.leadDone(answered);
  if (dishMode) lead = endedEarly ? COMPLETE.leadDishesEnded(answered) : COMPLETE.leadDishes(answered);
  else if (answered === 0) lead = COMPLETE.leadEmpty;
  else if (endedEarly) lead = COMPLETE.leadEnded(answered);
  let kicker = endedEarly ? COMPLETE.kickerEnded(round.round) : COMPLETE.kickerDone(round.round);

  return (
    <main className="screen screen-complete">
      <TopBar start={<CreationSteps steps={steps} />} end={<Avatar name={firstName} onClick={onToProfile} />} />

      <div className="stack">
        <p className="kicker">
          <CircleCheck aria-hidden="true" />
          {kicker}
        </p>
        <h1>{COMPLETE.title(firstName)}</h1>
        <p className="lead">{finished && !dishMode ? `${lead} ${COMPLETE.leadComplete}`.trim() : lead}</p>
      </div>

      {progress && <ProfileStatus progress={progress} />}

      {rounds && (
        <section className="panel" aria-labelledby="rounds-title">
          <h2 id="rounds-title" className="panel-title">
            {ROUNDS.title}
          </h2>
          <RoundOverview rounds={rounds} current={round.round} onResume={onResumeRound} />
          {rounds.some((entry) => entry.canResume) && <p className="note">{ROUNDS.resumeNote}</p>}
        </section>
      )}

      {Object.values(counts).some((count) => count > 0) && (
        <section className="panel" aria-labelledby="overview-title">
          <h2 id="overview-title" className="panel-title">
            {COMPLETE.overviewTitle}
          </h2>
          <ul className="count-list">
            {ROWS.filter((answer) => counts[answer] > 0).map((answer) => {
              const { Icon, label, tone } = metaFor(answer, variant);
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

      {ruleCount > 0 && !dishMode && (
        <p className="note note-with-icon">
          <Lock aria-hidden="true" />
          {COMPLETE.rules(ruleCount)}
        </p>
      )}

      <div className="action-bar">
        <p className="fineprint">{more ? COMPLETE.nextHint(nextTitles.slice(0, 3)) : COMPLETE.profileHint}</p>
        {more && (
          <button type="button" className="button-primary" onClick={onNextRound}>
            {COMPLETE.nextRound(nextNumber ?? round.round + 1)}
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
