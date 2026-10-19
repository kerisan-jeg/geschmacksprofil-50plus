import { CircleCheck, CircleDashed, CirclePause, Lock, Play } from 'lucide-react';
import { ROUND, ROUNDS } from '../labels.js';

const STATUS_ICON = { open: CircleDashed, started: CirclePause, completed: CircleCheck };

// Übersicht der vier Runden: Name, Status (Symbol und Text, nie nur Farbe), Fortschritt in Karten.
// Keine Statistik. onResume fehlt während des Wischens (nur Ansicht); auf dem Abschluss lässt sich eine
// begonnene Runde fortsetzen (rounds.js, canResume).
export default function RoundOverview({ rounds, current = null, onResume }) {
  return (
    <ul className="round-overview">
      {rounds.map((entry) => {
        const Icon = STATUS_ICON[entry.status];
        let detail = null;
        if (entry.locked) detail = ROUNDS.locked(entry.round - 1);
        else if (entry.empty) detail = ROUNDS.empty;
        else if (entry.status === 'started') detail = ROUNDS.progress(entry.answered, entry.total);
        else if (entry.status === 'completed') detail = ROUNDS.done(entry.answered);
        return (
          <li key={entry.round} className={`round-row is-${entry.status}${entry.round === current ? ' is-current' : ''}`} aria-current={entry.round === current ? 'step' : undefined}>
            <span className="round-row-icon">{entry.locked ? <Lock aria-hidden="true" /> : <Icon aria-hidden="true" />}</span>
            <span className="round-row-text">
              <span className="round-row-name">{ROUND.roundOf(entry.round, rounds.length, ROUND.roundNames[entry.round])}</span>
              <span className="round-row-status">
                {ROUNDS.status[entry.status]}
                {detail && ` · ${detail}`}
              </span>
            </span>
            {onResume && entry.canResume && (
              <button type="button" className="button-secondary round-resume" onClick={() => onResume(entry.round)}>
                <Play aria-hidden="true" />
                {ROUNDS.resume(entry.round)}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
