import { expect, type Page } from '@playwright/test';

/**
 * Every route is behind an account (ADR 0008), so a test that wants to reach the
 * app has to hold one. Each call registers a fresh learner, which also gives the
 * test a guaranteed-empty progress record — the isolation an anonymous browser
 * profile used to provide for free.
 *
 * Returns null when the build has no Supabase credentials: there is no gate to pass
 * in that configuration, and the caller is already where it wanted to be.
 */
export async function registerFreshLearner(page: Page): Promise<string | null> {
  await page.goto('/');

  // The gate is a client-side redirect, so it lands after `goto` has already
  // resolved. Wait for whichever screen actually settles rather than reading the
  // URL while the router is still deciding.
  await expect(
    page.getByRole('heading', { name: /Open cases|Sign in|Create an account/ }),
  ).toBeVisible();

  if (!page.url().endsWith('/auth')) return null;

  const email = `learner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  await page.getByRole('button', { name: 'Create one' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();

  // Both of these mean "no session", and both would otherwise surface as a bare
  // "Open cases heading not found" several seconds later, pointing nowhere near
  // the actual cause.
  const blocked = page.getByText(/Check your inbox|Too many attempts/);
  const dashboard = page.getByRole('heading', { name: 'Open cases' });
  await expect(blocked.or(dashboard)).toBeVisible();

  if (await blocked.isVisible()) {
    throw new Error(
      `Sign-up did not return a session: "${await blocked.textContent()}". ` +
        'Disable email confirmation on the Supabase project used for tests ' +
        '(auth.email.enable_confirmations = false), or wait out the sign-up rate limit.',
    );
  }

  return email;
}
