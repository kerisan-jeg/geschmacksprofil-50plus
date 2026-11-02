// Zentraler Gesamtexport. Nur der lokale Secret-/service_role-Schlüssel liest alle Sitzungen.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { sessionsToCsv, sessionsToJson } from '../src/logging/export.js';
import { apiHeaders } from '../src/sync/headers.js';

export function readConnectionSettings({ env = process.env, file = path.resolve('.env.local') } = {}) {
  const local = existsSync(file) ? parseEnv(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) : {};
  const url = String(env.SYNC_URL || env.VITE_SYNC_URL || local.SYNC_URL || local.VITE_SYNC_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = String(env.SYNC_SERVICE_KEY || local.SYNC_SERVICE_KEY || '').trim();
  const missing = [!url && 'VITE_SYNC_URL (oder SYNC_URL)', !serviceKey && 'SYNC_SERVICE_KEY'].filter(Boolean);
  if (missing.length) throw new Error(`Fehlt: ${missing.join(' und ')}. In .env.local eintragen und die Datei speichern.`);
  let role = null;
  try { role = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64url').toString()).role; } catch {}
  if (serviceKey.startsWith('sb_publishable_') || role === 'anon') throw new Error('SYNC_SERVICE_KEY braucht den lokalen Secret-/service_role-Schlüssel, keinen öffentlichen App-Schlüssel.');
  if (!['https:', 'http:'].includes(new URL(url).protocol)) throw new Error('Die Projekt-URL muss mit https:// oder http:// beginnen.');
  return { url, serviceKey };
}

export async function exportCentralSessions({ url, serviceKey, out = 'auswertung', table = 'sessions', fetchFn = globalThis.fetch, now = new Date() }) {
  if (!url || !serviceKey) throw new Error('Projekt-URL und lokaler Export-Schlüssel fehlen.');
  if (!/^[a-z_][a-z0-9_]*$/i.test(table)) throw new Error('Ungültiger Tabellenname.');
  const pageSize = 500;
  const sessions = [];
  for (let from = 0; ; from += pageSize) {
    const response = await fetchFn(`${url}/rest/v1/${table}?select=data,updated_at&order=started_at.asc,id.asc`, {
      headers: { ...apiHeaders(serviceKey), Range: `${from}-${from + pageSize - 1}`, 'Range-Unit': 'items' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok && response.status !== 206) throw new Error(`Gesamtexport fehlgeschlagen: HTTP ${response.status}.`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Die Datenbank hat keine Sitzungsliste zurückgegeben.');
    for (const row of rows) if (row.data?.sessionId) sessions.push(row.data);
    if (rows.length < pageSize) break;
  }
  mkdirSync(out, { recursive: true });
  const stamp = now.toISOString().replace('T', '-').replace(/[:.]/g, '-').replace('Z', '');
  const jsonFile = path.resolve(out, `sitzungen-${stamp}.json`);
  const csvFile = path.resolve(out, `ereignisse-${stamp}.csv`);
  writeFileSync(jsonFile, sessionsToJson(sessions), 'utf8');
  writeFileSync(csvFile, '\uFEFF' + sessionsToCsv(sessions), 'utf8');
  return { sessions: sessions.length, submitted: sessions.filter((session) => session.survey?.submittedAt).length, jsonFile, csvFile };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = {};
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i += 1) {
      if (argv[i] === '--out') options.out = argv[++i];
      else if (argv[i] === '--table') options.table = argv[++i];
      else throw new Error(`Unbekannte Option: ${argv[i]}`);
    }
    const result = await exportCentralSessions({ ...readConnectionSettings(), ...options });
    console.log(`${result.sessions} Sitzungen geholt (${result.submitted} mit Befragung), geschrieben: ${result.jsonFile}, ${result.csvFile}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
