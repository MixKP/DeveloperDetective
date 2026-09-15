import type { Attempt } from '../domain/Attempt.js';
import type {
  GradedAnswerContent,
  KnowledgeTestContent,
  TestVariant,
} from '../domain/readModels.js';

export interface SelectedOption {
  questionId: number;
  optionId: string;
}

export interface KnowledgeTestCatalog {
  findByVariant(variant: TestVariant): Promise<KnowledgeTestContent | null>;
}

/**
 * The same inversion the scenario answer key uses: there is no `getCorrectOption`
 * and no `getFeedback` to call, only a grading verdict for options a learner has
 * actually chosen. Nothing here can be used to preview the key.
 */
export interface TestAnswerKey {
  grade(testId: number, selections: SelectedOption[]): Promise<GradedAnswerContent[]>;
}

/**
 * How far through the catalog a learner is. `assessment` shares nothing with
 * `investigation` (ADR 0009), so it counts closed cases through this port rather than by
 * reading a run — the two modules still meet only in composition.ts.
 */
export interface CaseProgress {
  countCompleted(learnerId: string): Promise<number>;
  countCases(): Promise<number>;
}

export interface AttemptRepository {
  find(learnerId: string, testId: number): Promise<Attempt | null>;
  save(attempt: Attempt): Promise<void>;
}
