import { expect, test, type Page } from '@playwright/test';
import { registerFreshLearner } from './support/auth';

const SQL_CASE = 'Authentication bypass in the login service';

const CORRECT = ['auth.service.ts lines 23-24', 'The leading quote closes', 'parameterised query'];

// The app is gated, and each test wants a learner with no progress behind it.
test.beforeEach(async ({ page }) => {
  await registerFreshLearner(page);
});

async function openSqlCase(page: Page) {
  await page.goto('/');
  await page.getByRole('article').filter({ hasText: SQL_CASE }).getByRole('button').click();
  await expect(page).toHaveURL(/\/cases\/\d+\/brief/);
}

test.describe('the learner journey', () => {
  test('dashboard lists both seeded cases with no progress', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Open cases' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(2);
    await expect(page.getByText(SQL_CASE)).toBeVisible();
    await expect(page.getByText('Critical')).toBeVisible();

    await expect(page.getByText('Cases solved').locator('..')).toContainText('0');
  });

  test('the brief frames the learner as the engineer, not the attacker', async ({ page }) => {
    await openSqlCase(page);

    await expect(page.getByText('Priya Raman')).toBeVisible();
    await expect(page.getByText('Your objectives')).toBeVisible();
    await expect(page.getByText('You are the engineer on call')).toBeVisible();
  });

  test('vulnerable lines stay hidden until the locate question is solved', async ({ page }) => {
    await openSqlCase(page);
    await page.getByRole('button', { name: 'Open the repository' }).click();
    await expect(page).toHaveURL(/\/investigate/);

    await expect(page.locator('.dd-vulnerable-line')).toHaveCount(0);

    // The deploy markers are not part of the answer key, so they are on from the start:
    // they narrow the hunt to the lines the incident touched without naming the defect.
    await expect(page.locator('.dd-changed-margin').first()).toBeVisible();
    await expect(page.getByText('10 changed in this deploy')).toBeVisible();

    await expect(page.getByText('src/services/auth.service.ts', { exact: false })).toBeVisible();
    await expect(page.getByText('2 files changed in this deploy')).toBeVisible();
  });

  test('the debrief cannot be reached by deep-linking past the quiz', async ({ page }) => {
    await openSqlCase(page);
    const url = page.url();
    const caseId = url.match(/cases\/(\d+)/)![1];

    await page.goto(`/cases/${caseId}/debrief`);

    await expect(page).not.toHaveURL(/\/debrief/);
  });

  test('full run: hint, wrong answer, solve, debrief, ethical decision', async ({ page }) => {
    await openSqlCase(page);
    await page.getByRole('button', { name: 'Open the repository' }).click();
    await page.getByRole('button', { name: 'Report your findings' }).click();
    await expect(page).toHaveURL(/\/quiz/);

    const locate = page.getByRole('article').first();

    await expect(page.getByText('0 of 3 findings confirmed')).toBeVisible();
    await locate.getByRole('button', { name: /Reveal a hint/ }).click();
    await expect(locate.getByText('Hint 1.')).toBeVisible();

    await locate.getByText('pool.ts lines 4-8', { exact: false }).click();
    await locate.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('Not quite')).toBeVisible();

    await locate.getByText(CORRECT[0]!, { exact: false }).click();
    await locate.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('vulnerable lines are now highlighted')).toBeVisible();

    for (const [offset, text] of [CORRECT[1]!, CORRECT[2]!].entries()) {
      const question = page.getByRole('article').nth(offset + 1);
      await question.getByText(text, { exact: false }).click();
      await question.getByRole('button', { name: 'Submit answer' }).click();
    }
    await expect(page.getByText('3 of 3 findings confirmed')).toBeVisible();

    await page.getByRole('link', { name: 'Investigate' }).click();
    await expect(page.getByText('2 flagged')).toBeVisible();

    await page.getByRole('link', { name: 'Debrief' }).click();
    await expect(page).toHaveURL(/\/debrief/);

    await expect(page.getByText('Technical root cause')).toBeVisible();
    await expect(page.getByText('Business impact')).toBeVisible();
    await expect(page.getByText('Remediation')).toBeVisible();

    await expect(page.getByText('Final score').locator('..')).toContainText('75');

    await expect(page.getByText('The call is yours')).toBeVisible();
    const consequence = 'incident review named the escalation';
    await expect(page.getByText(consequence)).toHaveCount(0);
    await expect(page.getByText('Defensible call')).toHaveCount(0);

    await page.getByText('Fix it properly now', { exact: false }).click();
    await page.getByRole('button', { name: 'Commit to this decision' }).click();

    await expect(page.getByText('Defensible call')).toBeVisible();
    await expect(page.getByText(consequence)).toBeVisible();

    await expect(page.getByRole('button', { name: 'Commit to this decision' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Back to open cases' }).click();
    await expect(page.getByText('Cases solved').locator('..')).toContainText('1');
    await expect(page.getByText('Solved · 75')).toBeVisible();
  });

  test('progress survives a reload, because it lives on the server', async ({ page }) => {
    await openSqlCase(page);
    await page.getByRole('button', { name: 'Open the repository' }).click();
    await page.getByRole('button', { name: 'Report your findings' }).click();

    const locate = page.getByRole('article').first();
    await locate.getByText(CORRECT[0]!, { exact: false }).click();
    await locate.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('1 of 3 findings confirmed')).toBeVisible();

    await page.reload();

    await expect(page.getByText('1 of 3 findings confirmed')).toBeVisible();
  });
});

test.describe('theme', () => {
  test('the toggle switches theme and survives a reload', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');

    await page.getByRole('button', { name: /Switch to (dark|light) theme/ }).click();
    const chosen = await html.getAttribute('data-theme');
    expect(chosen).toMatch(/^(dark|light)$/);

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', chosen!);
  });
});
