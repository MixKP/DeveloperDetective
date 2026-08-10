import { answerRequestSchema, idParamSchema, submitProgressRequestSchema } from '@dd/shared';
import { z } from 'zod';

export const scenarioParams = z.object({ id: idParamSchema });

export const questionParams = z.object({ id: idParamSchema, qid: idParamSchema });

export { answerRequestSchema, submitProgressRequestSchema };
