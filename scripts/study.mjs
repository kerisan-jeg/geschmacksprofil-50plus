// Ein Befehl für das Team: zentral herunterladen und den aktuellen Studienbericht erstellen.
import { exportCentralSessions, readConnectionSettings } from './export-sessions.mjs';
import { parseArgs, runEvaluation } from './evaluate.mjs';

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('npm run studie -- [--out auswertung] [--exclude KENNUNG1,KENNUNG2] [--exclude-session TEILNAHMENUMMER1,TEILNAHMENUMMER2]');
  } else {
    if (options.inputs.length) throw new Error('Für lokale JSON-Dateien npm run auswertung verwenden. npm run studie lädt die Sitzungen selbst herunter.');
    const exported = await exportCentralSessions({ ...readConnectionSettings(), out: options.out });
    console.log(`${exported.sessions} Sitzungen zentral geladen. Rohdaten: ${exported.jsonFile}`);
    runEvaluation({ ...options, inputs: [exported.jsonFile] });
  }
} catch (error) {
  console.error(`Studienauswertung fehlgeschlagen: ${error.message}`);
  process.exitCode = 1;
}
