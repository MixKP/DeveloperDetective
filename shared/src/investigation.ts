import { z } from 'zod';
import { investigationStateSchema } from './scenario.js';

export const answerRequestSchema = z.object({
  optionId: z.string().min(1),
});

export const answerResponseSchema = z.object({
  correct: z.boolean(),
  explanation: z.string().nullable(),
  justUnlockedVulnerableLines: z.boolean(),
  state: investigationStateSchema,
});
export type AnswerResponse = z.infer<typeof answerResponseSchema>;

export const hintResponseSchema = z.object({
  hint: z.string(),
  index: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  state: investigationStateSchema,
});
export type HintResponse = z.infer<typeof hintResponseSchema>;
