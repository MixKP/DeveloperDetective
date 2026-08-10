import { z } from 'zod';

/**
 * Every non-2xx response from the API has this shape. One envelope, no exceptions,
 * so the client can handle failures uniformly.
 */
export const errorCodeSchema = z.enum([
  'VALIDATION_ERROR', // Zod rejected the request at the HTTP boundary
  'MISSING_LEARNER_ID', // X-Learner-Id header absent or not a UUID
  'NOT_FOUND', // unknown scenario, question, or choice
  'RULE_VIOLATION', // a domain invariant said no (e.g. hint past the last hint)
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
