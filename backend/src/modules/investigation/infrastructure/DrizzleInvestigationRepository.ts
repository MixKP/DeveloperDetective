import { and, eq } from 'drizzle-orm';
import type { Database } from '../../../platform/db/client.js';
import type { InvestigationRepository } from '../application/ports.js';
import { Investigation, type InvestigationSnapshot } from '../domain/Investigation.js';
import { progress } from './schema.js';

type Row = typeof progress.$inferSelect;

/**
 * Maps between the `progress` row and the `Investigation` aggregate.
 *
 * The table kept its original name while the aggregate is called Investigation, and the
 * translation lives here — a textbook case of the persistence model not being the domain
 * model. Nothing above this file knows the table exists.
 */
export class DrizzleInvestigationRepository implements InvestigationRepository {
  constructor(private readonly db: Database) {}

  async find(learnerId: string, scenarioId: number): Promise<Investigation | null> {
    const [row] = await this.db
      .select()
      .from(progress)
      .where(and(eq(progress.learnerId, learnerId), eq(progress.scenarioId, scenarioId)))
      .limit(1);

    return row ? Investigation.fromSnapshot(toSnapshot(row)) : null;
  }

  async findAllForLearner(learnerId: string): Promise<Investigation[]> {
    const rows = await this.db.select().from(progress).where(eq(progress.learnerId, learnerId));

    return rows.map((row) => Investigation.fromSnapshot(toSnapshot(row)));
  }

  async save(run: Investigation): Promise<void> {
    const snapshot = run.toSnapshot();

    const values = {
      learnerId: snapshot.learnerId,
      scenarioId: snapshot.scenarioId,
      wrongAttempts: snapshot.wrongAttempts,
      hintsUsed: run.hintsUsed,
      solvedQuestionIds: snapshot.solvedQuestionIds,
      revealedHints: toJsonHints(snapshot.revealedHints),
      vulnerableLinesUnlocked: snapshot.vulnerableLinesUnlocked,
      ethicalChoiceId: snapshot.ethicalChoiceId,
      completed: snapshot.completed,
      // Written for dashboard aggregation only; Score.derive() remains the authority.
      score: run.score.value,
      startedAt: snapshot.startedAt,
      completedAt: snapshot.completedAt,
    };

    // One upsert on the natural key, so a concurrent double-submit cannot create two rows
    // for the same learner and scenario.
    await this.db
      .insert(progress)
      .values(values)
      .onConflictDoUpdate({
        target: [progress.learnerId, progress.scenarioId],
        set: values,
      });
  }
}

function toSnapshot(row: Row): InvestigationSnapshot {
  return {
    learnerId: row.learnerId,
    scenarioId: row.scenarioId,
    solvedQuestionIds: row.solvedQuestionIds,
    // jsonb object keys are strings; Investigation.fromSnapshot converts them back to
    // numbers. Without that conversion every hint lookup would miss and hints would be free.
    revealedHints: row.revealedHints as unknown as Record<number, number>,
    wrongAttempts: row.wrongAttempts,
    vulnerableLinesUnlocked: row.vulnerableLinesUnlocked,
    ethicalChoiceId: row.ethicalChoiceId,
    completed: row.completed,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

function toJsonHints(hints: Record<number, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(hints));
}
