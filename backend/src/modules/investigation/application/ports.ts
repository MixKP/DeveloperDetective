import type { Investigation } from '../domain/Investigation.js';

export interface InvestigationRepository {
  find(learnerId: string, scenarioId: number): Promise<Investigation | null>;
  save(run: Investigation): Promise<void>;
  findAllForLearner(learnerId: string): Promise<Investigation[]>;
}
