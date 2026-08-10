import { z } from 'zod';
import { ethicalOutcomeSchema, investigationStateSchema } from './scenario.js';

export const submitProgressRequestSchema = z
  .object({
    scenarioId: z.number().int().positive(),
    completed: z.boolean(),
    ethicalChoiceId: z.number().int().positive().optional(),
  })
  .strict();
export type SubmitProgressRequest = z.infer<typeof submitProgressRequestSchema>;

export const submitProgressResponseSchema = z.object({
  state: investigationStateSchema,
  ethicalOutcome: ethicalOutcomeSchema.nullable(),
});
export type SubmitProgressResponse = z.infer<typeof submitProgressResponseSchema>;

export const progressRecordSchema = z.object({
  scenarioId: z.number().int(),
  scenarioSlug: z.string(),
  scenarioTitle: z.string(),
  state: investigationStateSchema,
  startedAt: z.string(),
  completedAt: z.string().nullable(),
});
export type ProgressRecord = z.infer<typeof progressRecordSchema>;

export const progressStatsSchema = z.object({
  casesSolved: z.number().int().nonnegative(),
  casesStarted: z.number().int().nonnegative(),
  averageScore: z.number().nullable(),
  hintsUsed: z.number().int().nonnegative(),
});
export type ProgressStats = z.infer<typeof progressStatsSchema>;

export const progressResponseSchema = z.object({
  records: z.array(progressRecordSchema),
  stats: progressStatsSchema,
});
export type ProgressResponse = z.infer<typeof progressResponseSchema>;
