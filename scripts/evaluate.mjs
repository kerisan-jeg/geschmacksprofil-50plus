// Auswertung der Kontrollkarten (Messkonzept, docs/messkonzept.md).
//
//   npm run auswertung -- <export.json oder Ordner> [weitere …] [--out auswertung] [--min 5] [--exclude T00,TEST]
//
// Eingabe: JSON-Exporte aus der Ansicht für die Testleitung (?admin=1 → „Export JSON (alles)“), auch von
// mehreren Geräten. Doppelte Sitzungen (gleiche sessionId) zählen einmal, die längere gewinnt.
// Ausgabe im Ordner --out (Standard: auswertung/, steht in .gitignore, nie ins Repo):
//   zusammenfassung.txt  dasselbe wie in der Konsole
//   lernkurve.csv        Kennzahlen je k (Anzahl Antworten der normalen Auswahl) und Auswahlverfahren
//   kontrollkarten.csv   jede Kontrollkarte: Antwort, Vermutung am Ende, richtig ja/nein
//   sitzungen.csv        je Sitzung: Antworten, Kontrollkarten, Dauer, Antwortzeit
//   varianten.csv        gleiche Daten, andere Annahmen des Präferenzmodells
// Die Exporte enthalten nur sessionId und Teilnehmer-Nr., nie Vorname oder Telefonnummer.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { indexCatalog } from '../src/logic/catalog.js';
import { CHECK_COLUMNS, CURVE_COLUMNS, evaluate, formatSummary, SESSION_COLUMNS, sessionRows, toCsv, VARIANT_COLUMNS } from '../src/analysis/evaluation.js';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const catalog = readJson(new URL('../src/data/catalog.json', import.meta.url));
const stage0 = readJson(new URL('../src/data/stage0.json', import.meta.url));

function parseArgs(argv) {
  const options = { inputs: [], out: 'auswertung', min: 5, exclude: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') options.out = argv[(i += 1)];
    else if (arg === '--min') options.min = Number(argv[(i += 1)]);
    else if (arg === '--exclude') options.exclude = String(argv[(i += 1)] ?? '').split(',').map((code) => code.trim()).filter(Boolean);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else options.inputs.push(arg);
  }
  return options;
}

function jsonFiles(input) {
  const stats = statSync(input);
  if (!stats.isDirectory()) return [input];
  return readdirSync(input)
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .map((name) => path.join(input, name));
}

// Export ({ sessions }), Liste von Sitzungen oder eine einzelne Sitzung.
function sessionsIn(file) {
  const data = readJson(file);
  if (Array.isArray(data?.sessions)) return data.sessions;
  if (Array.isArray(data)) return data;
  if (data?.sessionId) return [data];
  throw new Error(`${file}: keine Sitzungen gefunden (erwartet wird der JSON-Export aus ?admin=1)`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.inputs.length === 0) {
    console.log('Aufruf: npm run auswertung -- <export.json oder Ordner> [weitere …] [--out auswertung] [--min 5] [--exclude T00,TEST]');
    process.exitCode = options.help ? 0 : 1;
    return;
  }
  const byId = new Map();
  for (const file of options.inputs.flatMap(jsonFiles)) {
    for (const session of sessionsIn(file)) {
      if (!session?.sessionId) continue;
      const known = byId.get(session.sessionId);
      if (!known || (session.events?.length ?? 0) > (known.events?.length ?? 0)) byId.set(session.sessionId, session);
    }
  }
  const sessions = [...byId.values()].filter((session) => !options.exclude.includes(session.participantCode ?? ''));
  if (sessions.length === 0) {
    console.error('Keine Sitzungen zum Auswerten.');
    process.exitCode = 1;
    return;
  }

  const index = indexCatalog(catalog.cards);
  const result = evaluate(sessions, { index, diets: stage0.diets, minSessions: options.min });
  const summary = formatSummary(result, { minSessions: options.min });
  const bom = '﻿';
  mkdirSync(options.out, { recursive: true });
  writeFileSync(path.join(options.out, 'zusammenfassung.txt'), summary, 'utf8');
  writeFileSync(
    path.join(options.out, 'lernkurve.csv'),
    bom + toCsv(result.curves.flatMap(({ selection, curve }) => curve.map((row) => ({ selection, ...row }))), CURVE_COLUMNS),
    'utf8'
  );
  writeFileSync(path.join(options.out, 'kontrollkarten.csv'), bom + toCsv(result.checks, CHECK_COLUMNS), 'utf8');
  writeFileSync(path.join(options.out, 'sitzungen.csv'), bom + toCsv(sessionRows(index, result.datas), SESSION_COLUMNS), 'utf8');
  writeFileSync(path.join(options.out, 'varianten.csv'), bom + toCsv(result.variants, VARIANT_COLUMNS), 'utf8');
  console.log(summary);
  console.log(`Tabellen in ${path.resolve(options.out)}`);
}

main();
