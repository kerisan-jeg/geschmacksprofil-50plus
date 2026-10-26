// Druckt die Beispielszenarien aus src/test/szenarien.js als Tabelle: je Runde jede Karte mit Grund der Auswahl
// (selectionReason), Phase (main, holdout, dish) und Antwort, dazu Profil, Profilstand und Dashboard.
// Grundlage von docs/02_Kartenauswahl_und_Swipe_Logik.md (Ablaufbeispiele). Ändert nichts, liest nur.
//
//   node scripts/ablauf-beispiele.mjs            alle drei Szenarien
//   node scripts/ablauf-beispiele.mjs B          nur Szenario B
//   node scripts/ablauf-beispiele.mjs A --holdout=0 --limit=15   andere Konfiguration (wie URL-Parameter)

import { readFileSync } from 'node:fs';
import { indexCatalog } from '../src/logic/catalog.js';
import { playScenario, SZENARIEN } from '../src/test/szenarien.js';

const readJson = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const catalog = readJson('../src/data/catalog.json');
const stage0 = readJson('../src/data/stage0.json');
const allergens = readJson('../src/data/allergens.json');
const cuisines = readJson('../src/data/cuisines.json').cuisines;
const index = indexCatalog(catalog.cards);

const args = process.argv.slice(2);
const wanted = args.filter((arg) => !arg.startsWith('--')).map((arg) => arg.toUpperCase());
const config = {};
for (const arg of args.filter((entry) => entry.startsWith('--'))) {
  const [name, value] = arg.slice(2).split('=');
  if (name === 'holdout') config.holdout = Number(value);
  if (name === 'limit') config.roundCardLimit = Number(value);
  if (name === 'selection') config.selection = value;
}

for (const scenario of SZENARIEN.filter((entry) => wanted.length === 0 || wanted.includes(entry.id))) {
  const result = playScenario(scenario, { index, stage0, allergens, cuisines }, config);
  const onboarding = result.final.onboarding;
  console.log(`\n===== Szenario ${scenario.id}: ${scenario.name} (sessionId ${scenario.sessionId}) =====`);
  console.log(scenario.beschreibung);
  console.log(`Konfiguration: Limit ${result.config.roundCardLimit}, Auswahl ${result.config.selection}, Kontrollkarten ${result.config.holdout}`);
  console.log(`Ernährungsform: ${onboarding.diet ?? 'none'}; Ausschlüsse: ${onboarding.exclusions.map((entry) => `${entry.type}:${entry.value}`).join(', ') || 'keine'}`);
  console.log(`Kontrollkarten gezogen: ${result.holdout.map((id) => `${id} ${index.get(id).title}`).join(' | ') || 'keine'}`);
  for (const { round, cards } of result.rounds) {
    console.log(`\n--- Runde ${round}: ${cards.length} Karten ---`);
    cards.forEach((card, position) => {
      const extra = [card.excludedCardIds ? JSON.stringify(card.excludedCardIds) : '', card.notes.length ? `[${card.notes.join('; ')}]` : ''].filter(Boolean).join(' ');
      console.log(`${String(position + 1).padStart(2)}. ${card.id.padEnd(8)} ${card.title.padEnd(34)} ${card.reason.padEnd(26)} ${card.phase.padEnd(7)} -> ${card.response} ${extra}`);
    });
  }
  const { profile, progress, dashboard, derived } = result;
  console.log('\nProfil (direkte Antworten):');
  console.log(`  Mag ich sehr: ${profile.taste.PREFER.join(', ') || '–'}`);
  console.log(`  Mag ich:      ${profile.taste.LIKE.join(', ') || '–'}`);
  console.log(`  Mag ich nicht: ${profile.taste.DISLIKE.join(', ') || '–'}`);
  console.log(`  Kenne ich nicht: ${profile.unfamiliar.join(', ') || '–'}; Vertrage ich nicht: ${profile.intolerant.join(', ') || '–'}`);
  console.log(`Profilstand: ${progress.percent} % (Stufe 1: ${progress.points.stage1}, Stufe 2: ${progress.points.stage2}, Stufe 3: ${progress.points.stage3}), höchste abgeschlossene Stufe ${progress.stage}`);
  console.log(`Dashboard: ${dashboard.summary.total} Antworten (${dashboard.summary.groups} Gruppen, ${dashboard.summary.foods} Lebensmittel, ${dashboard.summary.dishes} Gerichte)`);
  console.log(`  Favoriten: ${dashboard.favorites.map((entry) => `${entry.id}:${entry.rating}`).join(', ') || '–'}`);
  console.log(`  Eher ungern mit Ausnahmen: ${dashboard.dislikes.filter((entry) => entry.exceptions.length).map((entry) => `${entry.id} → ${entry.exceptions.map((exception) => exception.id).join('+')}`).join('; ') || '–'}`);
  console.log(`  Küchen-Tendenz: ${dashboard.cuisines.map((entry) => `${entry.label} ${entry.direction} (${entry.rated})`).join('; ') || '– (unter CUISINE_MIN_RATED)'}`);
  console.log(`Vermutungen: ${derived.length}, stärkste: ${derived.slice(0, 5).map((entry) => `${entry.cardId}=${entry.rating} (${entry.score}, aus ${entry.basisId})`).join(' | ')}`);
}
