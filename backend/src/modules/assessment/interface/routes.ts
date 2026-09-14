import { Router, type Request, type RequestHandler, type Response } from 'express';
import { asyncHandler } from '../../../platform/http/asyncHandler.js';
import { requireLearnerId } from '../../../platform/http/learnerId.js';
import type { GetKnowledgeTest } from '../application/GetKnowledgeTest.js';
import type { SubmitAttempt } from '../application/SubmitAttempt.js';
import { submitAttemptRequestSchema, variantParams } from './dto.js';
import { toHttpError } from './errorMapping.js';

export interface AssessmentUseCases {
  getKnowledgeTest: GetKnowledgeTest;
  submitAttempt: SubmitAttempt;
}

const handle = (fn: (req: Request, res: Response) => Promise<void>) =>
  asyncHandler(async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      throw toHttpError(error);
    }
  });

export function createAssessmentRouter(
  useCases: AssessmentUseCases,
  requireLearner: RequestHandler = requireLearnerId,
): Router {
  const router = Router();

  router.get(
    '/tests/:variant',
    requireLearner,
    handle(async (req, res) => {
      const { variant } = variantParams.parse(req.params);
      res.json(await useCases.getKnowledgeTest.execute(req.learnerId, variant));
    }),
  );

  router.post(
    '/tests/:variant/attempt',
    requireLearner,
    handle(async (req, res) => {
      const { variant } = variantParams.parse(req.params);
      const payload = submitAttemptRequestSchema.parse(req.body);
      res.json(await useCases.submitAttempt.execute(req.learnerId, variant, payload));
    }),
  );

  return router;
}
