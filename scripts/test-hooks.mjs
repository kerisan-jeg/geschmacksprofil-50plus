// Lade-Hooks für `npm test` (node --test): JSX, JSON und CSS so laden, wie Vite es im Build tut.
// - .jsx wird mit Vites Oxc-Transformer übersetzt (gleiche Werkzeugkette wie der Build)
// - .json ohne Import-Attribut wird als Modul geladen (Komponenten importieren Daten wie in Vite)
// - .css wird ignoriert (Tests prüfen Verhalten, nicht Aussehen)
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transformWithOxc } from 'vite';

export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && url.endsWith('.jsx')) {
    const filename = fileURLToPath(url);
    const source = await readFile(filename, 'utf8');
    const result = await transformWithOxc(source, filename, { lang: 'jsx', jsx: { runtime: 'automatic' } });
    return { format: 'module', source: result.code, shortCircuit: true };
  }
  if (url.startsWith('file:') && url.endsWith('.css')) {
    return { format: 'module', source: 'export default {};', shortCircuit: true };
  }
  if (url.startsWith('file:') && url.endsWith('.json') && !context.importAttributes?.type) {
    const source = await readFile(fileURLToPath(url), 'utf8');
    return { format: 'module', source: `export default ${source};`, shortCircuit: true };
  }
  return nextLoad(url, context);
}
