import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../../../platform/db/client.js';
import type { AttemptRepository } from '../application/ports.js';
import { Attempt } from '../domain/Attempt.js';
import { knowledgeQuestions, testAttempts, testResponses } from './schema.js';

export class DrizzleAttemptRepository implements AttemptRepository {
  constructor(private readonly db: Database) {}

  async find(learnerId: string, testId: number): Promise<Attempt | null> {
    const [attempt] = await this.db
      .select()
      .from(testAttempts)
      .where(and(eq(testAttempts.learnerId, learnerId), eq(testAttempts.testId, testId)))
      .limit(1);

    if (!attempt) return null;

    const answers = await this.db
      .select({
        questionId: testResponses.questionId,
        selectedOption: testResponses.selectedOption,
        correct: testResponses.correct,
      })
      .from(testResponses)
      .innerJoin(knowledgeQuestions, eq(knowledgeQuestions.id, testResponses.questionId))
      .where(eq(testResponses.attemptId, attempt.id))
      .orderBy(asc(knowledgeQuestions.orderIndex));

    return Attempt.fromSnapshot({
      learnerId: attempt.learnerId,
      testId: attempt.testId,
      answers,
      submittedAt: attempt.submittedAt,
    });
  }

  async save(attempt: Attempt): Promise<void> {
    const snapshot = attempt.toSnapshot();

    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(testAttempts)
        .values({
          learnerId: snapshot.learnerId,
          testId: snapshot.testId,
          score: attempt.score.value,
          total: attempt.score.total,
          submittedAt: snapshot.submittedAt,
        })
        .returning({ id: testAttempts.id });

      if (!row) throw new Error('Failed to record the attempt');

      await tx.insert(testResponses).values(
        snapshot.answers.map((answer) => ({
          attemptId: row.id,
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          correct: answer.correct,
        })),
      );
    });
  }
}
