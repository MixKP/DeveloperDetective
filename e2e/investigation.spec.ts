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
  test('dashboard lists every seeded case with no progress', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Open cases' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(7);
    await expect(page.getByText(SQL_CASE)).toBeVisible();
    // Three of the seven are Critical, so this has to count rather than match one.
    await expect(page.getByText('Critical')).toHaveCount(3);

    await expect(page.getByText('Cases solved').locator('..')).toContainText('0');
  });

  test('the post-test is reachable from the top bar, and arrives locked', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Post-test' }).click();
    await expect(page).toHaveURL(/\/post-test/);

    // No case closed, so the server sends no questions at all.
    const check = page.locator('section').filter({ hasText: 'Core professional ethics' });
    await expect(check).toContainText('to unlock this');
    await expect(check.getByRole('button', { name: 'Start the knowledge check' })).toHaveCount(0);
    await expect(check.locator('ol > li')).toHaveCount(0);
  });

  test('every seeded case opens, briefs, and renders its repository', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByRole('article');
    // count() does not auto-wait, so settle the list before reading its length.
    await expect(cards).toHaveCount(7);
    const total = await cards.count();

    for (let i = 0; i < total; i += 1) {
      await page.goto('/');
      await cards.nth(i).getByRole('button').click();
      await expect(page).toHaveURL(/\/cases\/\d+\/brief/);
      await expect(page.getByText('Your objectives')).toBeVisible();

      await page.getByRole('button', { name: 'Open the repository' }).click();
      await expect(page).toHaveURL(/\/investigate/);
      // Monaco mounted and painted a line: the content of this case actually renders.
      await expect(page.locator('.view-lines').first()).toBeVisible();
      await expect(page.locator('.dd-vulnerable-line')).toHaveCount(0);
    }
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

    // The diff is not part of the answer key, so it is on from the start: it narrows the
    // hunt to what the incident deploy touched without naming the defect. Monaco marks
    // removed lines with .line-delete and added ones with .line-insert.
    await expect(page.locator('.line-delete').first()).toBeVisible();
    await expect(page.locator('.line-insert').first()).toBeVisible();

    await expect(page.getByText('src/services/auth.service.ts', { exact: false })).toBeVisible();
    await expect(page.getByText('2 files changed in this deploy')).toBeVisible();

    // An untouched file has no before, so it opens as a plain file with no diff at all.
    await page.getByText('pool.ts', { exact: false }).click();
    await expect(page.locator('.line-insert')).toHaveCount(0);
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
    // The post-test is not part of a case; it has its own page.
    await expect(page.getByText('Knowledge check')).toHaveCount(0);
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

    // The closed case unlocks the post-test, which lives behind the top-bar button.
    await page.getByRole('button', { name: 'Post-test' }).click();
    await expect(page).toHaveURL(/\/post-test/);
    const check = page.locator('section').filter({ hasText: 'Core professional ethics' });
    await expect(check).toBeVisible();
    await expect(check).not.toContainText('to unlock this');
    await check.getByRole('button', { name: 'Start the knowledge check' }).click();

    // One question per principle of the Code, drawn from a larger bank.
    const items = check.locator('ol > li');
    // Each question item leads with a row holding its number and its prompt.
    const prompts = () => check.locator('ol > li > div > p').allInnerTexts();
    await expect(items).toHaveCount(8);
    const firstSitting = await prompts();

    for (let i = 0; i < 8; i += 1) {
      await items.nth(i).locator('label').first().click();
    }
    await expect(check.getByText('8 of 8 answered')).toBeVisible();

    await check.getByRole('button', { name: 'Submit the knowledge check' }).click();

    await expect(check.getByText('Attempt 1', { exact: true })).toBeVisible();
    // The feedback names the principle it turns on; clause numbers stay in the record.
    await expect(check.getByText(/Principle \d/).first()).toBeVisible();
    await expect(check.getByText(/clause \d/)).toHaveCount(0);
    await expect(check.getByRole('button', { name: 'Submit the knowledge check' })).toHaveCount(0);

    // A finished sitting is replayed on reload rather than reopened.
    await page.reload();
    await expect(check.getByText('Attempt 1', { exact: true })).toBeVisible();
    await expect(check.getByRole('button', { name: 'Start the knowledge check' })).toHaveCount(0);

    // The retake deals a different hand from the same bank (ADR 0010).
    await check.getByRole('button', { name: /Sit it again/ }).click();
    await expect(check.getByText('Attempt 2', { exact: true })).toBeVisible();
    await expect(items).toHaveCount(8);
    const secondSitting = await prompts();
    expect(secondSitting).toHaveLength(8);
    expect(secondSitting).not.toEqual(firstSitting);
    expect(secondSitting.filter((prompt) => firstSitting.includes(prompt))).toEqual([]);
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
