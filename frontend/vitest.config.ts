import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // No jsdom: the store tests mock the api module outright, so nothing touches the DOM.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
