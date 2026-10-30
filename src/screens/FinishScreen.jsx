import { CircleCheck, Hourglass, RefreshCw, TriangleAlert } from 'lucide-react';
import { SYNC_STATES } from '../sync/sync.js';
import { FINISH } from '../labels.js';

// Abschlussbestätigung (Vorschlag 29.10.2026): Sie bestätigt die Teilnahme erst, wenn die Übertragung an die zentrale
// Datenbank gelungen ist. Vorher heisst es „Einen Moment“, bei einem Fehler gibt es „Erneut senden“. Ohne zentrale
// Speicherung (nicht eingerichtet) bleibt alles auf dem Gerät, und das steht so da.
// sync: Zustand aus src/sync/sync.js ({ enabled, state, lastError }).
export default function FinishScreen({ firstName, sessionId, sync, onRetry, onToProfile }) {
  const sending = sync.enabled && [SYNC_STATES.IDLE, SYNC_STATES.PENDING, SYNC_STATES.SENDING].includes(sync.state);
  const failed = sync.enabled && sync.state === SYNC_STATES.ERROR;
  const done = !sync.enabled || sync.state === SYNC_STATES.OK;
  let title = FINISH.title(firstName);
  if (sending) title = FINISH.sendingTitle;
  else if (failed) title = FINISH.errorTitle;

  return (
    <main className="screen screen-finish">
      <div className="stack">
        <p className="kicker">
          {done ? <CircleCheck aria-hidden="true" /> : <Hourglass aria-hidden="true" />}
          {FINISH.kicker}
        </p>
        <h1>{title}</h1>
        {sending && (
          <p className="lead" role="status">
            {FINISH.sending}
          </p>
        )}
        {done && sync.enabled && (
          <p className="lead" role="status">
            {FINISH.ok}
          </p>
        )}
        {done && !sync.enabled && <p className="lead">{FINISH.local}</p>}
        {failed && (
          <p className="notice notice-warn" role="alert">
            <TriangleAlert aria-hidden="true" />
            {FINISH.error}
          </p>
        )}
      </div>

      <section className="panel finish-panel" aria-labelledby="finish-code-title">
        <h2 id="finish-code-title" className="panel-title">
          {FINISH.codeTitle}
        </h2>
        <p className="finish-code num">{sessionId}</p>
        <p className="note">{FINISH.codeHint}</p>
      </section>

      <div className="action-bar">
        {failed && (
          <button type="button" className="button-primary" onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            {FINISH.retry}
          </button>
        )}
        <button type="button" className={failed ? 'button-secondary' : 'button-primary'} onClick={onToProfile}>
          {FINISH.toProfile}
        </button>
      </div>
    </main>
  );
}
