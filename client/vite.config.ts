import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Root is always provided via the CLI argument (`vite client`); this is a
  // safe fallback for editors that load the config on their own.
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  // Relative asset paths so the built files work from any static server
  // (vite preview, npx serve, subfolders) — not just from the site root.
  base: './',
  build: {
    outDir: 'dist',
  },
});
