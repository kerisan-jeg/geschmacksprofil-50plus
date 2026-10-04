import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' erzeugt relative Pfade. So läuft der Build auf GitHub Pages
// unabhängig vom Namen des Repositories.
export default defineConfig({
  plugins: [react()],
  base: './',
});
