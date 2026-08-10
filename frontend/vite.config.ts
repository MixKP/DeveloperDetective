import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Dev-only mirror of what nginx does in the container, so the app is same-origin in
    // both environments and CORS never enters the picture.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Monaco is ~2MB and belongs to one route. Splitting it keeps the dashboard's
        // first paint off the critical path of the code viewer.
        manualChunks: (id) => (id.includes('monaco-editor') ? 'monaco' : undefined),
      },
    },
  },
});
