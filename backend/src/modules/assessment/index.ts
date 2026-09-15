import type { RequestHandler, Router } from 'express';
import type { Database } from '../../platform/db/client.js';
import { GetKnowledgeTest } from './application/GetKnowledgeTest.js';
import { SubmitAttempt } from './application/SubmitAttempt.js';
import type {
  AttemptRepository,
  CaseProgress,
  KnowledgeTestCatalog,
  TestAnswerKey,
} from './application/ports.js';
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

export function createAssessmentAdapters(db: Database): {
  tests: KnowledgeTestCatalog;
  testAnswerKey: TestAnswerKey;
  attempts: AttemptRepository;
} {
  return {
    tests: new DrizzleKnowledgeTestCatalog(db),
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
