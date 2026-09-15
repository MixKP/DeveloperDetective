import type { RequestHandler, Router } from 'express';
import type { ContentCache } from '../../platform/cache/ContentCache.js';
import type { Database } from '../../platform/db/client.js';
import { GetKnowledgeTest } from './application/GetKnowledgeTest.js';
import { SubmitAttempt } from './application/SubmitAttempt.js';
import type {
  AttemptRepository,
  CaseProgress,
  KnowledgeTestCatalog,
  TestAnswerKey,
} from './application/ports.js';
import { CachedKnowledgeTestCatalog } from './infrastructure/CachedKnowledgeTestCatalog.js';
import { DrizzleAttemptRepository } from './infrastructure/DrizzleAttemptRepository.js';
import { DrizzleKnowledgeTestCatalog } from './infrastructure/DrizzleKnowledgeTestCatalog.js';
import { DrizzleTestAnswerKey } from './infrastructure/DrizzleTestAnswerKey.js';
import { createAssessmentRouter } from './interface/routes.js';

export type {
  AttemptRepository,
  CaseProgress,
  KnowledgeTestCatalog,
  SelectedOption,
  TestAnswerKey,
} from './application/ports.js';
export { Attempt } from './domain/Attempt.js';
export { CASES_REQUIRED, Eligibility } from './domain/Eligibility.js';
export type { AttemptAnswer, AttemptSnapshot } from './domain/Attempt.js';
export type {
  EthicsPrinciple,
  GradedAnswerContent,
  KnowledgeTestContent,
  TestQuestionContent,
  TestVariant,
} from './domain/readModels.js';

/**
 * The bank is cached; attempts are not. An attempt is the learner's own record and
 * changes on every sitting, which is the one thing a content cache must not hold.
 */
export function createAssessmentAdapters(
  db: Database,
  cache?: ContentCache,
): {
  tests: KnowledgeTestCatalog;
  testAnswerKey: TestAnswerKey;
  attempts: AttemptRepository;
} {
  const tests = new DrizzleKnowledgeTestCatalog(db);

  return {
    tests: cache ? new CachedKnowledgeTestCatalog(tests, cache) : tests,
    testAnswerKey: new DrizzleTestAnswerKey(db),
    attempts: new DrizzleAttemptRepository(db),
  };
}

export interface AssessmentModuleDeps {
  tests: KnowledgeTestCatalog;
  testAnswerKey: TestAnswerKey;
  attempts: AttemptRepository;
  cases: CaseProgress;
  requireLearner?: RequestHandler;
}

export function createAssessmentModule({
  tests,
  testAnswerKey,
  attempts,
  cases,
  requireLearner,
}: AssessmentModuleDeps): { router: Router } {
  return {
    router: createAssessmentRouter(
      {
        getKnowledgeTest: new GetKnowledgeTest(tests, testAnswerKey, attempts, cases),
        submitAttempt: new SubmitAttempt(tests, testAnswerKey, attempts, cases),
      },
      requireLearner,
    ),
  };
}
