import type { RequestHandler, Router } from 'express';
import type { AnswerKey, ScenarioCatalog } from '../catalog/index.js';
import { AnswerQuestion } from './application/AnswerQuestion.js';
import { GetProgress } from './application/GetProgress.js';
import { GetScenarioDetail } from './application/GetScenarioDetail.js';
import { GetScenarioList } from './application/GetScenarioList.js';
import { RequestHint } from './application/RequestHint.js';
import { SubmitProgress } from './application/SubmitProgress.js';
import type { InvestigationRepository } from './application/ports.js';
import { createInvestigationRouter } from './interface/routes.js';

export type { InvestigationRepository } from './application/ports.js';
export { Investigation } from './domain/Investigation.js';
export type { InvestigationSnapshot } from './domain/Investigation.js';

export interface InvestigationModuleDeps {
  catalog: ScenarioCatalog;
  answerKey: AnswerKey;
  investigations: InvestigationRepository;
  requireLearner?: RequestHandler;
}

export function createInvestigationModule({
  catalog,
  answerKey,
  investigations,
  requireLearner,
}: InvestigationModuleDeps): { router: Router } {
  return {
    router: createInvestigationRouter(
      {
        getScenarioList: new GetScenarioList(catalog, investigations),
        getScenarioDetail: new GetScenarioDetail(catalog, answerKey, investigations),
        answerQuestion: new AnswerQuestion(catalog, answerKey, investigations),
        requestHint: new RequestHint(catalog, answerKey, investigations),
        submitProgress: new SubmitProgress(catalog, answerKey, investigations),
        getProgress: new GetProgress(catalog, investigations),
      },
      requireLearner,
    ),
  };
}
