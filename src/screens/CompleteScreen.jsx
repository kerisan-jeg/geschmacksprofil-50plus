import { ArrowRight, CircleCheck, Lock, Soup, Sparkles } from 'lucide-react';
import CreationSteps from '../components/CreationSteps.jsx';
import Avatar from '../components/Avatar.jsx';
import ProfileStatus from '../components/ProfileStatus.jsx';
import TopBar from '../components/TopBar.jsx';
import { ANSWER_META } from '../components/answerMeta.js';
import { computeProfile } from '../logic/engine.js';
import { DISLIKE, INTOLERANT, LIKE, PREFER, UNFAMILIAR } from '../logic/answers.js';
import { COMPLETE } from '../labels.js';

const ROWS = [PREFER, LIKE, DISLIKE, UNFAMILIAR, INTOLERANT];

// Abschluss nach jeder Runde (nurec v0.2, Kap. 3: „Kurze Runde beenden und Profilstand sichern“):
// kurze Übersicht, „Profil aufgebaut“ (Anhang B2), dann weiter, solange eine weitere Runde erlaubt ist, oder
// „Mein Profil ansehen“. Freiwillig danach: Gerichte (Stufe 4, nach Stufe 2) und das Alltagsprofil (Kap. 2.3).
// Zahlen sind reine Zählungen der Antworten; der Prozentwert ist ein Erfassungsgrad (siehe ProfileStatus).
// mode: 'main' (Profilerstellung) oder 'dishes' (Gerichte). nextTitles: Karten der nächsten Runde (leer = keine),
// nextNumber: Nummer dieser nächsten Runde (nach Gerichten ist round.round „G1“, daher von aussen).
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
  dishes = { available: false, started: false },
  practicalDone = true,
  onNextRound,
  onStartDishes,
  onOpenPractical,
  onToProfile,
}) {
  const dishMode = mode === 'dishes';
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
  if (dishMode) kicker = COMPLETE.kickerDishes;
  const showPractical = finished && !practicalDone && Boolean(onOpenPractical);
  const showOptional = (dishes.available && Boolean(onStartDishes)) || showPractical;

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

      {Object.values(counts).some((count) => count > 0) && (
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

      {ruleCount > 0 && !dishMode && (
        <p className="note note-with-icon">
          <Lock aria-hidden="true" />
          {COMPLETE.rules(ruleCount)}
        </p>
      )}

      {showOptional && (
        <section className="panel optional-panel" aria-labelledby="optional-title">
          <h2 id="optional-title" className="panel-title">
            {COMPLETE.optionalTitle}
          </h2>
          {dishes.available && onStartDishes && (
            <div className="optional-item">
              <p className="note">{COMPLETE.dishesHint}</p>
              <button type="button" className="button-secondary" onClick={onStartDishes}>
                <Soup aria-hidden="true" />
                {dishes.started ? COMPLETE.moreDishes : COMPLETE.startDishes}
              </button>
            </div>
          )}
          {showPractical && (
            <div className="optional-item">
              <p className="note">{COMPLETE.practicalHint}</p>
              <button type="button" className="button-secondary" onClick={onOpenPractical}>
                <Sparkles aria-hidden="true" />
                {COMPLETE.startPractical}
              </button>
            </div>
          )}
        </section>
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
