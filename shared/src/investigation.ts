import { z } from 'zod';
import { investigationStateSchema } from './scenario.js';

/**
 * Grading and hint reveal both happen server-side, so these are the only two ways the
 * learner's score can move. Neither request carries a score — the server derives it.
 */

export const answerRequestSchema = z.object({
  optionId: z.string().min(1),
});
export type AnswerRequest = z.infer<typeof answerRequestSchema>;

export const answerResponseSchema = z.object({
  correct: z.boolean(),
  /**
   * Present only when `correct` is true. A wrong answer teaches nothing here on purpose —
   * shipping the explanation on a miss would let a learner farm all four options for the
   * write-up without ever reasoning about the code.
   */
  explanation: z.string().nullable(),
  /** True on the transition where a `locate` answer just unlocked line highlighting. */
  justUnlockedVulnerableLines: z.boolean(),
  state: investigationStateSchema,
});
export type AnswerResponse = z.infer<typeof answerResponseSchema>;

/** Hint requests have no body: which hint comes next is server state, not a client choice. */
export const hintResponseSchema = z.object({
  /** The newly revealed hint text. */
  hint: z.string(),
  /** Zero-based index of the hint just revealed. */
  index: z.number().int().nonnegative(),
  /** Total hints available for this question. */
  total: z.number().int().nonnegative(),
  state: investigationStateSchema,
});
export type HintResponse = z.infer<typeof hintResponseSchema>;
