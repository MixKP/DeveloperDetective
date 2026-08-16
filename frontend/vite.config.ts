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
    // The size warning fires on InvestigateView, which carries monaco. That chunk
    // is meant to be big: it loads only when the editor does. Do not "fix" it with
    // manualChunks — forcing monaco into a named chunk puts vite's preload helper
    // in there too, the entry imports the helper, and every page then preloads
    // 1 MB of gzipped editor. Left alone, first load is ~148 kB.
    chunkSizeWarningLimit: 4000,
  },
});
