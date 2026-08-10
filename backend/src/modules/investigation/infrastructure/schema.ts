import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * The investigation run, persisted as a single row.
 *
 * NO FOREIGN KEY TO `scenarios`, deliberately. A cross-module FK would mean this module's
 * schema importing catalog's table objects, which is exactly the reach-past-the-front-door
 * that the module boundary forbids — and it is the one thing that would have to be undone
 * if catalog were ever extracted into its own service.
 *
 * The integrity that FK would have bought is handled in the application instead: GetProgress
 * skips runs whose scenario is no longer in the catalog rather than failing the dashboard.
 *
 * The whole aggregate is one row, so it loads and saves atomically with no joins. The jsonb
 * columns hold per-question state that would otherwise need a child table nobody queries
 * independently.
 */
export const progress = pgTable(
  'progress',
  {
    id: serial('id').primaryKey(),
    /** Pseudonymous progress key from the X-Learner-Id header. Not an authenticated user. */
    learnerId: uuid('learner_id').notNull(),
    scenarioId: integer('scenario_id').notNull(),

    wrongAttempts: integer('wrong_attempts').notNull().default(0),
    /** Denormalized sum of `revealed_hints`, kept for dashboard aggregation in SQL. */
    hintsUsed: integer('hints_used').notNull().default(0),
    solvedQuestionIds: jsonb('solved_question_ids').$type<number[]>().notNull().default([]),
    /** questionId → hints revealed so far. */
    revealedHints: jsonb('revealed_hints').$type<Record<string, number>>().notNull().default({}),
    vulnerableLinesUnlocked: boolean('vulnerable_lines_unlocked').notNull().default(false),

    ethicalChoiceId: integer('ethical_choice_id'),
    completed: boolean('completed').notNull().default(false),

    /**
     * A cached projection of the derived score, written on save so the dashboard can
     * aggregate in SQL. The domain never reads it back as truth — Score.derive() is the
     * only authority.
     */
    score: integer('score').notNull().default(100),

    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    // Makes every write a clean upsert and every per-learner lookup an index hit.
    unique('progress_learner_scenario_key').on(t.learnerId, t.scenarioId),
    index('progress_learner_idx').on(t.learnerId),
  ],
);
