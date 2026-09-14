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

export const knowledgeTestResponseSchema = z.object({
  slug: z.string(),
  variant: testVariantSchema,
  title: z.string(),
  description: z.string(),
  questions: z.array(testQuestionViewSchema),
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
