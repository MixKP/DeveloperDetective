import { z } from 'zod';
import { ethicalOutcomeSchema, investigationStateSchema } from './scenario.js';

/**
 * NOTE ON WHAT IS MISSING HERE.
 *
 * There is no `score` field on the request, and that is the point. A client-supplied score
 * is not ignored — it is rejected by Zod as an unrecognized key, so tampering fails loudly
 * at the HTTP boundary instead of silently doing nothing. The server derives the score from
 * its own counters (hints revealed, wrong attempts) and returns it.
 */
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
  /** Returned on the request that commits an ethical choice. */
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

/** Dashboard stat tiles. */
export const progressStatsSchema = z.object({
  casesSolved: z.number().int().nonnegative(),
  casesStarted: z.number().int().nonnegative(),
  /** Mean score across completed cases only; null when nothing is finished yet. */
  averageScore: z.number().nullable(),
  hintsUsed: z.number().int().nonnegative(),
});
export type ProgressStats = z.infer<typeof progressStatsSchema>;

export const progressResponseSchema = z.object({
  records: z.array(progressRecordSchema),
  stats: progressStatsSchema,
});
export type ProgressResponse = z.infer<typeof progressResponseSchema>;

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['ok', 'unreachable']),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
