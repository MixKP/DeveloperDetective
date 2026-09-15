import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // The repo keeps one .env at the root; without this, vite would only read frontend/.env.
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    // The size warning fires on InvestigateView, which carries monaco — ~600 kB
    // gzipped once src/monaco.ts trimmed it to the editor core and the languages
    // the scenarios use. That chunk is meant to be big: it loads only when the
    // editor does, and BriefView prefetches it while the brief is being read. Do
    // not "fix" it with manualChunks — forcing monaco into a named chunk puts
    // vite's preload helper in there too, the entry imports the helper, and every
    // page then preloads the editor. Left alone, first load is ~145 kB.
    chunkSizeWarningLimit: 2500,
  },
});
