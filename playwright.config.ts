import { defineConfig, devices } from '@playwright/test';

/**
 * Point the suite at a deployed environment instead of localhost:
 *
 *   E2E_BASE_URL=https://developer-detective-frontend.vercel.app npx playwright test
 *
 * With it set, Playwright starts no local servers — the target is already running.
 *
 * Be deliberate about which tests you send at a real deployment: the journey specs
 * register an account and write progress rows, in whatever database that URL points
 * at. `@smoke` marks the ones that only read, and is what a post-deploy check should
 * run: `npx playwright test --grep @smoke`.
 */
const remote = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: remote ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: remote
    ? undefined
    : [
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
