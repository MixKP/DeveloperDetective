import type { Express } from 'express';
import {
  createAssessmentModule,
  type AttemptRepository,
  type CaseProgress,
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

/**
 * The post-test is gated on how much of the platform a learner has been through, which
 * is a fact `investigation` owns and `assessment` must not read for itself (ADR 0009).
 * The two modules meet here, each through its public API, and neither knows the other.
 */
function caseProgressFrom(deps: ApiDeps): CaseProgress {
  return {
    countCompleted: (learnerId) => deps.investigations.countCompleted(learnerId),
    countCases: () => deps.catalog.countScenarios(),
  };
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
    cases: caseProgressFrom(deps),
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
