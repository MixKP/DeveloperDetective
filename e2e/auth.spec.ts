import { expect, test } from '@playwright/test';
import { registerFreshLearner } from './support/auth';

const EMAIL = `learner-${Date.now()}@example.com`;
const PASSWORD = 'secret123';

test('register, land on the dashboard signed in, sign out, sign back in', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/auth');

  // Builds without Supabase credentials have no gate and no account flow (ADR 0008).
  const unavailable = page.getByText('This build has no Supabase credentials');
  test.skip(await unavailable.isVisible(), 'auth is not configured for this build');

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.getByRole('button', { name: 'Create one' }).click();
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  // Redirected to the dashboard, header shows the account, cases load with a token.
  await expect(page).toHaveURL('/');
  await expect(page.getByText(EMAIL)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Open cases' })).toBeVisible();
  await expect(page.getByText('A live payment key')).toBeVisible();

  // A fresh account starts at zero.
  await expect(page.getByText('Cases solved').locator('..')).toContainText('0');

  // Signing out drops the learner back at the gate, not at the dashboard.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/auth$/);

  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(page).toHaveURL('/');
  await page.reload();
  await expect(page.getByText(EMAIL)).toBeVisible();

  // Wrong password is reported, not swallowed.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/auth');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(page.getByText('That email and password do not match.')).toBeVisible();

  // The 400 is the wrong-password rejection above; the browser logs every failed fetch.
  expect(errors.filter((e) => !e.includes('400'))).toEqual([]);
});

test("a second account never sees the first one's progress, not even briefly", async ({ page }) => {
  const first = await registerFreshLearner(page);
  test.skip(first === null, 'auth is not configured for this build');

  // Give the first account something to leak.
  await page.getByRole('article').first().getByRole('button').click();
  await expect(page).toHaveURL(/\/cases\/\d+\/brief/);
  await page.goto('/');
  await expect(page.getByText('Cases opened').locator('..')).toContainText('1');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/auth$/);

  // Hold the second account's progress response open. Without it the fetch lands so
  // fast that a stale store is invisible to the test while still being visible to a
  // real learner on a slower link — the assertion below would pass either way.
  await page.route('**/api/progress', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });

  await page.getByRole('button', { name: 'Create one' }).click();
  await page.getByLabel('Email').fill(`learner-${Date.now()}-second@example.com`);
  await page.getByLabel('Password').fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();

  // The stores are cleared synchronously when the account changes, so the first
  // render the second learner sees is already their own zero — no waiting on the API.
  await expect(page.getByRole('heading', { name: 'Open cases' })).toBeVisible();
  expect(await page.getByText('Cases opened').locator('..').textContent()).toContain('0');
});

// @smoke — reads only: no account is created, no row is written. Safe to run against
// a real deployment as a post-deploy check.
test('a signed-out visitor cannot deep-link past the gate @smoke', async ({ page }) => {
  await page.goto('/auth');
  test.skip(
    await page.getByText('This build has no Supabase credentials').isVisible(),
    'auth is not configured for this build',
  );

  for (const target of ['/', '/cases/1/brief', '/cases/1/quiz', '/cases/1/debrief']) {
    await page.goto(target);
    await expect(page).toHaveURL(/\/auth$/);
  }
});
