import { useState } from 'react';
import { Download, FileJson, Trash2, UserPlus } from 'lucide-react';
import { deleteAllSessions, downloadText, listSessions } from '../logging/logger.js';
import { sessionsToCsv, sessionsToJson, summarizeSession } from '../logging/export.js';
import { resolveConfig } from '../config.js';

// Ansicht für die Testleitung (A9). Nur über ?admin=1 erreichbar und nirgends verlinkt.
// Alles bleibt auf diesem Gerät; Export als JSON (alles) und CSV (eine Zeile pro Ereignis).

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatDuration(ms) {
  if (ms == null) return null;
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} min`;
}

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

function stamp() {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
}

// Neue Testperson: App ohne ?admin neu laden. Gespeicherte Sitzungen bleiben erhalten,
// die übrigen Parameter (limit, tutorial) ebenfalls.
function participantUrl() {
  const params = new URLSearchParams(window.location.search);
  params.delete('admin');
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
}

export default function AdminScreen() {
  const [sessions, setSessions] = useState(() => listSessions());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const config = resolveConfig(window.location.search);
  const summaries = sessions.map(summarizeSession);
  const eventCount = sessions.reduce((sum, session) => sum + (session.events?.length ?? 0), 0);

  return (
    <main className="screen screen-admin">
      <p className="kicker">Nur für die Testleitung</p>
      <h1>Sitzungen</h1>
      <p className="lead">
        {plural(sessions.length, 'Sitzung', 'Sitzungen')} mit {plural(eventCount, 'Ereignis', 'Ereignissen')} auf diesem Gerät. Nächste Testperson startet mit{' '}
        {config.roundCardLimit} Karten pro Runde, Tutorial {config.tutorial ? 'an' : 'aus'}.
      </p>

      <a className="button-primary" href={participantUrl()}>
        <UserPlus aria-hidden="true" />
        Neue Testperson starten
      </a>

      <div className="admin-exports">
        <button
          type="button"
          className="button-secondary"
          disabled={sessions.length === 0}
          onClick={() => downloadText(`geschmacksprofil-sitzungen-${stamp()}.json`, sessionsToJson(sessions), 'application/json')}
        >
          <FileJson aria-hidden="true" />
          Export JSON (alles)
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={sessions.length === 0}
          onClick={() =>
            downloadText(`geschmacksprofil-ereignisse-${stamp()}.csv`, `﻿${sessionsToCsv(sessions)}`, 'text/csv;charset=utf-8')
          }
        >
          <Download aria-hidden="true" />
          Export CSV (Ereignisse)
        </button>
      </div>

      {summaries.length > 0 && (
        <ul className="admin-list">
          {summaries.map((summary) => (
            <li key={summary.sessionId}>
              <strong>{summary.participantCode ?? 'ohne Nr.'}</strong>
              <span>
                {formatDate(summary.startedAt)} · {summary.finished ? `fertig, ${formatDuration(summary.durationMs)}` : 'nicht beendet'}
              </span>
              <span className="note">
                {summary.answers} Antworten, {summary.undos} × Rückgängig · Limit {summary.config?.roundCardLimit}, Tutorial{' '}
                {summary.config?.tutorial ? 'an' : 'aus'} · {summary.sessionId}
              </span>
            </li>
          ))}
        </ul>
      )}

      <section className="admin-danger">
        {confirmDelete ? (
          <>
            <p className="form-error" role="alert">
              Wirklich {sessions.length === 1 ? 'die Sitzung' : `alle ${sessions.length} Sitzungen`} auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen. Vorher
              exportieren.
            </p>
            <div className="sheet-actions">
              <button type="button" className="button-secondary" onClick={() => setConfirmDelete(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="button-primary button-danger"
                onClick={() => {
                  deleteAllSessions();
                  setSessions(listSessions());
                  setConfirmDelete(false);
                }}
              >
                Endgültig löschen
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="button-secondary" disabled={sessions.length === 0} onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden="true" />
            Alle Daten löschen
          </button>
        )}
      </section>
    </main>
  );
}
