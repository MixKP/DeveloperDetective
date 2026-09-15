import type { Investigation } from '../domain/Investigation.js';

export interface InvestigationRepository {
  find(learnerId: string, scenarioId: number): Promise<Investigation | null>;
  save(run: Investigation): Promise<void>;
  findAllForLearner(learnerId: string): Promise<Investigation[]>;

  /** The same count `findAllForLearner(...).filter(completed)` produces, without
   *  loading a row — the post-test gate asks for it on every load and submission. */
  countCompleted(learnerId: string): Promise<number>;
}
