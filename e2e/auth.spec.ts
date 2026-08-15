import { expect, test } from '@playwright/test';

const EMAIL = `learner-${Date.now()}@example.com`;
const PASSWORD = 'secret123';

test('register, land on the dashboard signed in, sign out, sign back in', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/auth');

  // Builds without Supabase credentials are anonymous-only by design (ADR 0007);
  // there is no account flow to exercise.
  const unavailable = page.getByText('This build has no Supabase credentials');
  test.skip(await unavailable.isVisible(), 'auth is not configured for this build');

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.getByRole('button', { name: 'Create one' }).click();
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  // Redirected to the dashboard, header shows the account, cases load with a token.
  await expect(page).toHaveURL('http://localhost:5173/');
  await expect(page.getByText(EMAIL)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Open cases' })).toBeVisible();
  await expect(page.getByText('A live payment key')).toBeVisible();

  // A fresh account starts at zero.
  await expect(page.getByText('Cases solved').locator('..')).toContainText('0');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

  // The session survives a reload once signed back in.
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(page).toHaveURL('http://localhost:5173/');
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
