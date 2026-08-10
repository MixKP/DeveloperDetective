import { defineConfig } from 'vitest/config';

/**
 * Unit + API tests. These run with no database, no network and no containers, which is what
 * lets them run on every push and in a pre-commit hook.
 *
 * Integration tests live in tests/integration and are excluded here — they need a real
 * PostgreSQL and run via `npm run test:integration`.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/integration/**', 'node_modules/**'],
  },
});
