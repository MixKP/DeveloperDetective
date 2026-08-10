import { answerRequestSchema, idParamSchema, submitProgressRequestSchema } from '@dd/shared';
import { z } from 'zod';

/**
 * Zod at the HTTP boundary. Params arrive as strings and are coerced here, so nothing
 * downstream has to wonder whether an id is a number.
 */
export const scenarioParams = z.object({ id: idParamSchema });

export const questionParams = z.object({ id: idParamSchema, qid: idParamSchema });

export { answerRequestSchema, submitProgressRequestSchema };
