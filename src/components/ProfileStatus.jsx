import { ArrowRight } from 'lucide-react';
import { PROGRESS } from '../labels.js';

// Profilstand nach nurec v0.2, Anhang B2: „Profil aufgebaut“ in Prozent, die höchste abgeschlossene Stufe und
// (im Profil) der nächste sinnvolle Schritt. Der Prozentwert ist ein Erfassungsgrad, keine Trefferquote: Das steht
// direkt darunter. Er wird in src/logic/dashboard.js berechnet (35/30/35) und sinkt durch neue Antworten nie.
// next: { type: 'continue' | 'round' | 'practical' | 'done', number?, titles? } oder null.
export default function ProfileStatus({ progress, next = null, onNext }) {
  const nextText = next ? (next.type === 'round' ? PROGRESS.next.round(next.number, next.titles ?? []) : PROGRESS.next[next.type]) : null;
  let actionLabel = null;
  if (next && next.type !== 'done') actionLabel = next.type === 'round' ? PROGRESS.action.round(next.number) : PROGRESS.action[next.type];

  return (
    <section className="panel profile-status" aria-labelledby="status-title">
      <div className="status-head">
        <h2 id="status-title" className="status-title">
          {PROGRESS.title}
        </h2>
        <p className="status-value num" aria-hidden="true">
          {PROGRESS.value(progress.percent)}
        </p>
      </div>
      <div
        className="status-bar"
        role="progressbar"
        aria-labelledby="status-title"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-valuetext={PROGRESS.valueText(progress.percent)}
      >
        <span className="status-fill" style={{ '--value': `${progress.percent}%` }} />
      </div>
      <p className="status-stage">{PROGRESS.stages[progress.stage]}</p>
      <p className="note">{PROGRESS.note}</p>
      {nextText && (
        <div className="status-next">
          <p className="status-next-title">{PROGRESS.nextTitle}</p>
          <p>{nextText}</p>
          {actionLabel && onNext && (
            <button type="button" className="button-secondary" onClick={() => onNext(next)}>
              {actionLabel}
              <ArrowRight aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
