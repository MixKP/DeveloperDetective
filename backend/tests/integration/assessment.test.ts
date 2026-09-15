import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testsDirectory } from '../../src/modules/assessment/content/index.js';
import { DrizzleAttemptRepository } from '../../src/modules/assessment/infrastructure/DrizzleAttemptRepository.js';
import { DrizzleKnowledgeTestCatalog } from '../../src/modules/assessment/infrastructure/DrizzleKnowledgeTestCatalog.js';
import { DrizzleTestAnswerKey } from '../../src/modules/assessment/infrastructure/DrizzleTestAnswerKey.js';
import { importKnowledgeTests } from '../../src/modules/assessment/infrastructure/seed/import.js';
import { Attempt } from '../../src/modules/assessment/domain/Attempt.js';
import { createDb, type DbHandle } from '../../src/platform/db/client.js';

const LEARNER = '7c1f2a55-4c3e-4a11-9b6d-2f8e4a0b1c33';

let handle: DbHandle;
let catalog: DrizzleKnowledgeTestCatalog;
let answerKey: DrizzleTestAnswerKey;
let attempts: DrizzleAttemptRepository;

beforeAll(() => {
  handle = createDb(process.env.TEST_DATABASE_URL!);
  catalog = new DrizzleKnowledgeTestCatalog(handle.db);
  answerKey = new DrizzleTestAnswerKey(handle.db);
  attempts = new DrizzleAttemptRepository(handle.db);
});

afterAll(async () => {
  await handle.close();
});

describe('the knowledge test seed', () => {
  it('is idempotent and keeps question ids stable', async () => {
    const before = await handle.db.execute<{ id: number }>(
      sql`select id from knowledge_questions order by order_index`,
    );

    await importKnowledgeTests(handle.db, testsDirectory);

    const after = await handle.db.execute<{ id: number }>(
      sql`select id from knowledge_questions order by order_index`,
    );

    expect([...after].map((r) => Number(r.id))).toEqual([...before].map((r) => Number(r.id)));
  });

  it('imported the post-test with every question', async () => {
    const test = await catalog.findByVariant('post');
    expect(test?.slug).toBe('core-professional-ethics');
    expect(test?.questions.length).toBeGreaterThanOrEqual(10);
  });

  it('imported the sitting size and the per-principle guidance', async () => {
    const test = await catalog.findByVariant('post');

    expect(test?.questionsPerAttempt).toBeGreaterThanOrEqual(8);
    expect(test!.questionsPerAttempt).toBeLessThanOrEqual(test!.questions.length);
    for (const question of test!.questions) {
      expect(test!.guidance[question.principle], question.principle).toBeTruthy();
    }
  });
});

describe('the catalog projection', () => {
  it('carries no key and no feedback out of the database', async () => {
    const test = await catalog.findByVariant('post');
    const serialized = JSON.stringify(test);

    expect(serialized).not.toContain('correctOption');
    expect(serialized).not.toContain('feedback');
  });
});

describe('DrizzleAttemptRepository', () => {
  /** One sitting of the first `size` questions, answered with the first option. */
  const sitting = async (attemptNumber: number, size: number) => {
    const test = await catalog.findByVariant('post');
    if (!test) throw new Error('the post-test was not seeded');

    const asked = test.questions.slice(0, size);
    const graded = await answerKey.grade(
      test.id,
      asked.map((question) => ({ questionId: question.id, optionId: question.options[0]!.id })),
    );

    return {
      test,
      asked,
      attempt: Attempt.submit(
        LEARNER,
        test.id,
        attemptNumber,
        graded.map((answer) => ({
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          correct: answer.correct,
        })),
        asked.map((question) => question.id),
      ),
    };
  };

  it('round-trips a sitting with its answers', async () => {
    const { test, asked, attempt } = await sitting(1, 8);

    await attempts.save(attempt);

    const [restored, ...rest] = await attempts.history(LEARNER, test.id);
    expect(rest).toEqual([]);
    expect(restored!.attemptNumber).toBe(1);
    expect([...restored!.gradedAnswers].map((a) => a.questionId).sort()).toEqual(
      asked.map((q) => q.id).sort(),
    );
    expect(restored!.score.total).toBe(asked.length);
  });

  it('keeps every sitting, numbered and in order', async () => {
    const second = await sitting(2, 4);

    await attempts.save(second.attempt);

    const history = await attempts.history(LEARNER, second.test.id);
    expect(history.map((a) => a.attemptNumber)).toEqual([1, 2]);
    expect(history[1]!.score.total).toBe(4);
  });

  it('refuses a repeat of a sitting already recorded, at the database level', async () => {
    const duplicate = await sitting(2, 4);

    await expect(attempts.save(duplicate.attempt)).rejects.toThrow(/already been recorded/i);
  });
});
