import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const testVariantEnum = pgEnum('test_variant', ['pre', 'post']);

export const ethicsPrincipleEnum = pgEnum('ethics_principle', [
  'public',
  'client-and-employer',
  'product',
  'judgement',
  'management',
  'profession',
  'colleagues',
  'self',
]);

export const knowledgeTests = pgTable('knowledge_tests', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  variant: testVariantEnum('variant').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
});

export const knowledgeQuestions = pgTable(
  'knowledge_questions',
  {
    id: serial('id').primaryKey(),
    testId: integer('test_id')
      .notNull()
      .references(() => knowledgeTests.id, { onDelete: 'cascade' }),
    prompt: text('prompt').notNull(),
    // Each option carries the feedback for choosing it, which is the only place
    // that names the principle a wrong answer breached.
    options: jsonb('options').$type<{ id: string; text: string; feedback: string }[]>().notNull(),
    correctOption: text('correct_option').notNull(),
    principle: ethicsPrincipleEnum('principle').notNull(),
    clause: text('clause').notNull(),
    explanation: text('explanation').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (t) => [unique('knowledge_questions_test_order_key').on(t.testId, t.orderIndex)],
);

export const testAttempts = pgTable(
  'test_attempts',
  {
    id: serial('id').primaryKey(),
    learnerId: uuid('learner_id').notNull(),
    testId: integer('test_id')
      .notNull()
      .references(() => knowledgeTests.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    total: integer('total').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One sitting per learner per test. The aggregate refuses a retake, and this
    // keeps a race between two tabs from producing two results to report.
    unique('test_attempts_learner_test_key').on(t.learnerId, t.testId),
    index('test_attempts_test_idx').on(t.testId),
  ],
);

export const testResponses = pgTable(
  'test_responses',
  {
    id: serial('id').primaryKey(),
    attemptId: integer('attempt_id')
      .notNull()
      .references(() => testAttempts.id, { onDelete: 'cascade' }),
    questionId: integer('question_id')
      .notNull()
      .references(() => knowledgeQuestions.id, { onDelete: 'cascade' }),
    selectedOption: text('selected_option').notNull(),
    correct: boolean('correct').notNull(),
  },
  (t) => [unique('test_responses_attempt_question_key').on(t.attemptId, t.questionId)],
);
