import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  unique,
} from 'drizzle-orm/pg-core';

/**
 * Tables owned by the catalog module.
 *
 * Schema lives inside the module rather than in one global file, which is what makes
 * per-module table ownership a physical fact rather than a convention. `db/schema.ts`
 * re-exports these purely so drizzle-kit can see them.
 */

export const severityEnum = pgEnum('severity', ['Critical', 'High', 'Medium']);
export const questionKindEnum = pgEnum('question_kind', ['locate', 'explain', 'solve']);
export const ethicalQualityEnum = pgEnum('ethical_quality', ['good', 'neutral', 'bad']);

export const scenarios = pgTable('scenarios', {
  id: serial('id').primaryKey(),
  /** Natural key. The seed upserts on this, which is what makes reseeding idempotent. */
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  severity: severityEnum('severity').notNull(),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  estimatedMinutes: integer('estimated_minutes').notNull(),
  language: text('language').notNull(),

  briefSender: text('brief_sender').notNull(),
  briefSenderRole: text('brief_sender_role').notNull(),
  briefSubject: text('brief_subject').notNull(),
  briefReceivedAt: text('brief_received_at').notNull(),
  briefBody: text('brief_body').notNull(),
  briefObjectives: jsonb('brief_objectives').$type<string[]>().notNull().default([]),

  // The debrief is gated content: served only once the quiz is complete.
  rootCause: text('root_cause').notNull(),
  businessImpact: text('business_impact').notNull(),
  remediation: text('remediation').notNull(),
});

export const files = pgTable(
  'files',
  {
    id: serial('id').primaryKey(),
    scenarioId: integer('scenario_id')
      .notNull()
      .references(() => scenarios.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    code: text('code').notNull(),
    language: text('language').notNull(),
    /** Gated: reachable only through AnswerKey.vulnerableLines(). */
    vulnerableLines: jsonb('vulnerable_lines').$type<number[]>().notNull().default([]),
    recentlyChanged: boolean('recently_changed').notNull().default(false),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (t) => [unique('files_scenario_path_key').on(t.scenarioId, t.path)],
);

export const questions = pgTable(
  'questions',
  {
    id: serial('id').primaryKey(),
    scenarioId: integer('scenario_id')
      .notNull()
      .references(() => scenarios.id, { onDelete: 'cascade' }),
    kind: questionKindEnum('kind').notNull(),
    prompt: text('prompt').notNull(),
    options: jsonb('options').$type<{ id: string; text: string }[]>().notNull(),
    /** THE answer key. Never selected by any query that feeds a response DTO. */
    correctOption: text('correct_option').notNull(),
    explanation: text('explanation').notNull(),
    hints: jsonb('hints').$type<string[]>().notNull().default([]),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (t) => [unique('questions_scenario_order_key').on(t.scenarioId, t.orderIndex)],
);

export const ethicalChoices = pgTable(
  'ethical_choices',
  {
    id: serial('id').primaryKey(),
    scenarioId: integer('scenario_id')
      .notNull()
      .references(() => scenarios.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    /** Gated: revealed only after the learner commits to a choice. */
    quality: ethicalQualityEnum('quality').notNull(),
    outcome: text('outcome').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (t) => [unique('ethical_choices_scenario_order_key').on(t.scenarioId, t.orderIndex)],
);
