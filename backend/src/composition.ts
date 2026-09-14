import type { Express } from 'express';
import {
  createAssessmentModule,
  type AttemptRepository,
  type KnowledgeTestCatalog,
  type TestAnswerKey,
} from './modules/assessment/index.js';
import type { AnswerKey, ScenarioCatalog } from './modules/catalog/index.js';
import {
  createInvestigationModule,
  type InvestigationRepository,
} from './modules/investigation/index.js';
import { createHealthRouter } from './platform/health/health.controller.js';
import { createRequireLearner } from './platform/http/learnerId.js';
import { createServer } from './platform/http/server.js';
import type { VerifyToken } from './platform/http/token.js';

export interface ApiDeps {
  catalog: ScenarioCatalog;
  answerKey: AnswerKey;
  investigations: InvestigationRepository;
  tests: KnowledgeTestCatalog;
  testAnswerKey: TestAnswerKey;
  attempts: AttemptRepository;
  pingDb: () => Promise<boolean>;
  corsOrigins?: string[];
  /** Omit to run anonymous-only: bearer tokens are then rejected outright. */
  verifyToken?: VerifyToken;
}

export function createApiApp(deps: ApiDeps): Express {
  const requireLearner = createRequireLearner(deps.verifyToken);

  const investigation = createInvestigationModule({
    catalog: deps.catalog,
    answerKey: deps.answerKey,
    investigations: deps.investigations,
    requireLearner,
  });

  const assessment = createAssessmentModule({
    tests: deps.tests,
    testAnswerKey: deps.testAnswerKey,
    attempts: deps.attempts,
    requireLearner,
  });

  return createServer({
    routers: [
      { path: '/api', router: createHealthRouter(deps.pingDb) },
      { path: '/api', router: investigation.router },
      { path: '/api', router: assessment.router },
    ],
    corsOrigins: deps.corsOrigins,
  });
}
