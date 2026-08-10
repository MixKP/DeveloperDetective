import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests: a real browser against the real API and a real database.
 *
 * Each test gets a fresh browser context, which means a fresh localStorage, which means a
 * fresh learner UUID — so tests are independent without any database cleanup between them.
 * That is a genuine benefit of the pseudonymous-id design (ADR 0006) falling out for free.
 *
 * Requires a migrated and seeded database:
 *   docker run -d --name dd-pg -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16
 *   npm run db:migrate && npm run db:seed
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'npm run dev:api',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev:web',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
