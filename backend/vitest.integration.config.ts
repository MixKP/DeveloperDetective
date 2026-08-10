import { defineConfig } from 'vitest/config';

/**
 * Integration tests: the Drizzle repositories and the seed importer against a real
 * PostgreSQL.
 *
 * Kept separate from the default suite on purpose. These need a database, so folding them
 * into `npm test` would mean the unit suite could no longer run on a laptop with nothing
 * provisioned — and a suite people cannot run is a suite people stop running.
 *
 *   docker run -d --name dd-pg -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16
 *   npm run test:integration
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/globalSetup.ts'],
    // One database, shared across files: these tests write to it, so running them in
    // parallel would have them fighting over the same progress rows.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
