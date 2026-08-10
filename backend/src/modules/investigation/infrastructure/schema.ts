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

export const progress = pgTable(
  'progress',
  {
    id: serial('id').primaryKey(),
    learnerId: uuid('learner_id').notNull(),
    scenarioId: integer('scenario_id').notNull(),

    wrongAttempts: integer('wrong_attempts').notNull().default(0),
    hintsUsed: integer('hints_used').notNull().default(0),
    solvedQuestionIds: jsonb('solved_question_ids').$type<number[]>().notNull().default([]),
    revealedHints: jsonb('revealed_hints').$type<Record<string, number>>().notNull().default({}),
    vulnerableLinesUnlocked: boolean('vulnerable_lines_unlocked').notNull().default(false),

    ethicalChoiceId: integer('ethical_choice_id'),
    completed: boolean('completed').notNull().default(false),

    score: integer('score').notNull().default(100),

    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    unique('progress_learner_scenario_key').on(t.learnerId, t.scenarioId),
    index('progress_learner_idx').on(t.learnerId),
  ],
);
