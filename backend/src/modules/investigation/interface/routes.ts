import { Router, type Request, type RequestHandler, type Response } from 'express';
import { asyncHandler } from '../../../platform/http/asyncHandler.js';
import { requireLearnerId } from '../../../platform/http/learnerId.js';
import type { AnswerQuestion } from '../application/AnswerQuestion.js';
import type { GetProgress } from '../application/GetProgress.js';
import type { GetScenarioDetail } from '../application/GetScenarioDetail.js';
import type { GetScenarioList } from '../application/GetScenarioList.js';
import type { RequestHint } from '../application/RequestHint.js';
import type { SubmitProgress } from '../application/SubmitProgress.js';
import {
  answerRequestSchema,
  questionParams,
  scenarioParams,
  submitProgressRequestSchema,
} from './dto.js';
import { toHttpError } from './errorMapping.js';

export interface InvestigationUseCases {
  getScenarioList: GetScenarioList;
  getScenarioDetail: GetScenarioDetail;
  answerQuestion: AnswerQuestion;
  requestHint: RequestHint;
  submitProgress: SubmitProgress;
  getProgress: GetProgress;
}

const handle = (fn: (req: Request, res: Response) => Promise<void>) =>
  asyncHandler(async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      throw toHttpError(error);
    }
  });

export function createInvestigationRouter(
  useCases: InvestigationUseCases,
  requireLearner: RequestHandler = requireLearnerId,
): Router {
  const router = Router();

  router.get(
    '/scenarios',
    requireLearner,
    handle(async (req, res) => {
      res.json(await useCases.getScenarioList.execute(req.learnerId));
    }),
  );

  router.get(
    '/scenarios/:id',
    requireLearner,
    handle(async (req, res) => {
      const { id } = scenarioParams.parse(req.params);
      res.json(await useCases.getScenarioDetail.execute(req.learnerId, id));
    }),
  );

  router.post(
    '/scenarios/:id/questions/:qid/answer',
    requireLearner,
    handle(async (req, res) => {
      const { id, qid } = questionParams.parse(req.params);
      const { optionId } = answerRequestSchema.parse(req.body);
      res.json(await useCases.answerQuestion.execute(req.learnerId, id, qid, optionId));
    }),
  );

  router.post(
    '/scenarios/:id/questions/:qid/hint',
    requireLearner,
    handle(async (req, res) => {
      const { id, qid } = questionParams.parse(req.params);
      res.json(await useCases.requestHint.execute(req.learnerId, id, qid));
    }),
  );

  router.post(
    '/progress',
    requireLearner,
    handle(async (req, res) => {
      const payload = submitProgressRequestSchema.parse(req.body);
      res.json(await useCases.submitProgress.execute(req.learnerId, payload));
    }),
  );

  router.get(
    '/progress',
    requireLearner,
    handle(async (req, res) => {
      res.json(await useCases.getProgress.execute(req.learnerId));
    }),
  );

  return router;
}
