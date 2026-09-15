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
  selectedOption: z.string(),
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

export const attemptResultSchema = z.object({
  score: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  submittedAt: z.string(),
  answers: z.array(gradedAnswerSchema),
});
export type AttemptResult = z.infer<typeof attemptResultSchema>;

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
  /** Empty while the test is locked: the questions are withheld, not merely hidden. */
  questions: z.array(testQuestionViewSchema),
  eligibility: testEligibilitySchema,
  /** The learner's one attempt, or null if they have not taken it yet. */
  attempt: attemptResultSchema.nullable(),
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
