import { z } from 'zod';
import { ethicsPrincipleSchema, testVariantSchema } from './primitives.js';

export const testOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

/**
 * What a learner is allowed to see before they submit: the prompt and the option
 * text, and nothing that would tell them which option is right. The per-option
 * feedback and the key stay on the server until an attempt exists.
 */
export const testQuestionViewSchema = z.object({
  id: z.number().int(),
  prompt: z.string(),
  options: z.array(testOptionSchema),
  orderIndex: z.number().int(),
});
export type TestQuestionView = z.infer<typeof testQuestionViewSchema>;

export const gradedAnswerSchema = z.object({
  questionId: z.number().int(),
  /** Carried with the verdict so a result stays readable after the next draw. */
  prompt: z.string(),
  selectedOption: z.string(),
  selectedText: z.string(),
  correctOption: z.string(),
  correct: z.boolean(),
  /** Which principle the chosen option honoured or breached, and the clause behind it. */
  principle: ethicsPrincipleSchema,
  clause: z.string(),
  /** Feedback for the option the learner actually chose, not for the right one. */
  feedback: z.string(),
  explanation: z.string(),
});
export type GradedAnswer = z.infer<typeof gradedAnswerSchema>;

/**
 * What to do next, rather than what went wrong. A missed principle names the
 * guidance authored for it; a mastered one is what the learner can stop revising.
 */
export const attemptSummarySchema = z.object({
  verdict: z.string(),
  missed: z.array(
    z.object({
      principle: ethicsPrincipleSchema,
      questionIds: z.array(z.number().int()),
      guidance: z.string(),
    }),
  ),
  mastered: z.array(ethicsPrincipleSchema),
});
export type AttemptSummary = z.infer<typeof attemptSummarySchema>;

export const attemptResultSchema = z.object({
  attemptNumber: z.number().int().positive(),
  score: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  submittedAt: z.string(),
  answers: z.array(gradedAnswerSchema),
  summary: attemptSummarySchema,
});
export type AttemptResult = z.infer<typeof attemptResultSchema>;

/** One line per sitting, oldest first — the record the course reports on. */
export const attemptRecordSchema = z.object({
  attemptNumber: z.number().int().positive(),
  score: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  submittedAt: z.string(),
});
export type AttemptRecord = z.infer<typeof attemptRecordSchema>;

/**
 * Why the test is open, or is not. The post-test measures what the platform taught, so
 * it stays shut until the learner has actually been through some of it: `casesRequired`
 * is what the gate asks for today, `casesTotal` what the course would ideally ask for.
 */
export const testEligibilitySchema = z.object({
  eligible: z.boolean(),
  casesCompleted: z.number().int().nonnegative(),
  casesRequired: z.number().int().positive(),
  casesTotal: z.number().int().nonnegative(),
});
export type TestEligibility = z.infer<typeof testEligibilitySchema>;

export const knowledgeTestResponseSchema = z.object({
  slug: z.string(),
  variant: testVariantSchema,
  title: z.string(),
  description: z.string(),
  /**
   * The draw for the next sitting, in the order it should be asked, with each
   * question's options already shuffled for this learner. Empty while the test is
   * locked: the questions are withheld, not merely hidden.
   */
  questions: z.array(testQuestionViewSchema),
  eligibility: testEligibilitySchema,
  /** Which sitting the questions above belong to. 1 before anything is submitted. */
  attemptNumber: z.number().int().positive(),
  /** The most recent sitting's result, or null if there is none yet. */
  attempt: attemptResultSchema.nullable(),
  history: z.array(attemptRecordSchema),
});
export type KnowledgeTestResponse = z.infer<typeof knowledgeTestResponseSchema>;

export const submitAttemptRequestSchema = z
  .object({
    responses: z
      .array(
        z.object({
          questionId: z.number().int().positive(),
          optionId: z.string().min(1),
        }),
      )
      .min(1),
  })
  .strict();
export type SubmitAttemptRequest = z.infer<typeof submitAttemptRequestSchema>;

export const submitAttemptResponseSchema = z.object({
  attempt: attemptResultSchema,
});
export type SubmitAttemptResponse = z.infer<typeof submitAttemptResponseSchema>;
