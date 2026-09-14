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
  it('round-trips an attempt with its answers in question order', async () => {
    const test = await catalog.findByVariant('post');
    if (!test) throw new Error('the post-test was not seeded');

    const selections = test.questions.map((question) => ({
      questionId: question.id,
      optionId: question.options[0]!.id,
    }));

    const graded = await answerKey.grade(test.id, selections);
    expect(graded).toHaveLength(test.questions.length);

    await attempts.save(
      Attempt.submit(
        LEARNER,
        test.id,
        graded.map((answer) => ({
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          correct: answer.correct,
        })),
        test.questions.map((question) => question.id),
      ),
    );

    const restored = await attempts.find(LEARNER, test.id);
    expect(restored).not.toBeNull();
    expect(restored!.gradedAnswers.map((a) => a.questionId)).toEqual(
      test.questions.map((q) => q.id),
    );
    expect(restored!.score.total).toBe(test.questions.length);
  });

  it('refuses a second attempt at the database level, not only in the aggregate', async () => {
    const test = await catalog.findByVariant('post');
    if (!test) throw new Error('the post-test was not seeded');

    const duplicate = Attempt.submit(
      LEARNER,
      test.id,
      test.questions.map((question) => ({
        questionId: question.id,
        selectedOption: question.options[0]!.id,
        correct: false,
      })),
      test.questions.map((question) => question.id),
    );

    await expect(attempts.save(duplicate)).rejects.toThrow();
  });
});
