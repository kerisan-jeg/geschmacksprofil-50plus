// Wird von `npm test` vor allen Tests geladen (node --import). Registriert die Lade-Hooks.
import { register } from 'node:module';

register('./test-hooks.mjs', import.meta.url);
