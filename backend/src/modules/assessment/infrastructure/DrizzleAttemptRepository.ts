import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../../../platform/db/client.js';
import type { AttemptRepository } from '../application/ports.js';
import { Attempt, type AttemptAnswer } from '../domain/Attempt.js';
import { testAttempts, testResponses } from './schema.js';

/** Postgres' unique_violation. The sitting number is already taken. */
const UNIQUE_VIOLATION = '23505';

export class DrizzleAttemptRepository implements AttemptRepository {
  constructor(private readonly db: Database) {}

  async history(learnerId: string, testId: number): Promise<Attempt[]> {
    const rows = await this.db
      .select({
        attemptId: testAttempts.id,
        attemptNumber: testAttempts.attemptNumber,
        submittedAt: testAttempts.submittedAt,
        questionId: testResponses.questionId,
        selectedOption: testResponses.selectedOption,
        correct: testResponses.correct,
      })
      .from(testAttempts)
      .innerJoin(testResponses, eq(testResponses.attemptId, testAttempts.id))
      .where(and(eq(testAttempts.learnerId, learnerId), eq(testAttempts.testId, testId)))
      .orderBy(asc(testAttempts.attemptNumber), asc(testResponses.id));

    // One join rather than a query per sitting: the history is read on every load
    // of the test, and a learner who has sat it five times should still cost one
    // round trip.
    const sittings = new Map<
      number,
      { attemptNumber: number; submittedAt: Date; answers: AttemptAnswer[] }
    >();

    for (const row of rows) {
      const sitting = sittings.get(row.attemptId) ?? {
        attemptNumber: row.attemptNumber,
        submittedAt: row.submittedAt,
        answers: [],
      };
      sitting.answers.push({
        questionId: row.questionId,
        selectedOption: row.selectedOption,
        correct: row.correct,
      });
      sittings.set(row.attemptId, sitting);
    }

    return [...sittings.values()].map((sitting) =>
      Attempt.fromSnapshot({ learnerId, testId, ...sitting }),
    );
  }

  async save(attempt: Attempt): Promise<void> {
    const snapshot = attempt.toSnapshot();

    try {
      await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(testAttempts)
          .values({
            learnerId: snapshot.learnerId,
            testId: snapshot.testId,
            attemptNumber: snapshot.attemptNumber,
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
    } catch (error) {
      // The constraint refuses the race the aggregate cannot see: another tab
      // recorded this sitting between the history read and this insert.
      if (isUniqueViolation(error)) Attempt.rejectDuplicateSitting();
      throw error;
    }
  }
}

/**
 * Drizzle wraps the driver's error, so the SQLSTATE is a `cause` or two down. The
 * chain is walked with a depth limit rather than trusting it to terminate.
 */
function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth += 1) {
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
