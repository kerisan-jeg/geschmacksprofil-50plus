// Gesamtexport der zentralen Speicherung (docs/zentrale-speicherung.md): holt alle Sitzungen aus der Datenbank und
// schreibt sie wie die Admin-Ansicht als JSON (alles) und CSV (eine Zeile pro Ereignis) in den Ordner auswertung/
// (steht in .gitignore, nie ins Repo). Danach wie gewohnt: npm run auswertung -- auswertung/sitzungen-<datum>.json
//
//   npm run export:zentral
//
// Braucht die Adresse der Datenbank und den Service-Schlüssel des Teams (liest alles, darum nie in der App und nie im
// Repo): als Umgebungsvariablen SYNC_URL und SYNC_SERVICE_KEY oder in .env.local (VITE_SYNC_URL, SYNC_SERVICE_KEY).
// Optional: --out <ordner> (Standard auswertung), --table <name> (Standard sessions).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sessionsToCsv, sessionsToJson } from '../src/logging/export.js';

function readEnvFile(file) {
  if (!existsSync(file)) return {};
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

function parseArgs(argv) {
  const options = { out: 'auswertung', table: 'sessions' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') options.out = argv[++i];
    else if (argv[i] === '--table') options.table = argv[++i];
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const envFile = readEnvFile(path.resolve('.env.local'));
const url = (process.env.SYNC_URL || envFile.SYNC_URL || envFile.VITE_SYNC_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SYNC_SERVICE_KEY || envFile.SYNC_SERVICE_KEY || '';
if (!url || !serviceKey) {
  console.error('Fehlt: SYNC_URL und SYNC_SERVICE_KEY (Umgebung oder .env.local). Siehe docs/zentrale-speicherung.md.');
  process.exit(1);
}

const PAGE = 500;
const sessions = [];
for (let from = 0; ; from += PAGE) {
  const response = await fetch(`${url}/rest/v1/${options.table}?select=data,updated_at&order=started_at.asc`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' },
  });
  if (!response.ok && response.status !== 206) {
    console.error(`Abfrage fehlgeschlagen: HTTP ${response.status} ${await response.text()}`);
    process.exit(1);
  }
  const rows = await response.json();
  for (const row of rows) if (row.data?.sessionId) sessions.push(row.data);
  if (rows.length < PAGE) break;
}

mkdirSync(options.out, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const jsonFile = path.join(options.out, `sitzungen-${stamp}.json`);
const csvFile = path.join(options.out, `ereignisse-${stamp}.csv`);
writeFileSync(jsonFile, sessionsToJson(sessions), 'utf8');
writeFileSync(csvFile, `﻿${sessionsToCsv(sessions)}`, 'utf8');
const finished = sessions.filter((session) => session.survey?.submittedAt).length;
console.log(`${sessions.length} Sitzungen geholt (${finished} mit Befragung), geschrieben: ${jsonFile}, ${csvFile}`);
