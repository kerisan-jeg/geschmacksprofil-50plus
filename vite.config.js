import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' erzeugt relative Pfade. So läuft der Build auf GitHub Pages
// unabhängig vom Namen des Repositories.
// React liegt in einem eigenen Paket: Es ändert sich selten und bleibt im Browser-Cache, wenn sich nur die App ändert.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }],
        },
      },
    },
  },
});
