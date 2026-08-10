import type { Investigation } from '../domain/Investigation.js';

/**
 * Persistence port for the Investigation aggregate.
 *
 * Declared here, on the inner side of the architecture, and implemented out in
 * infrastructure by `DrizzleInvestigationRepository`. That inversion is what lets every use
 * case be tested against an in-memory fake with no Postgres anywhere in sight.
 *
 * The interface is deliberately small: no generic BaseRepository, no findAll, no CRUD
 * surface nobody calls. It exposes exactly the three operations the use cases need.
 */
export interface InvestigationRepository {
  find(learnerId: string, scenarioId: number): Promise<Investigation | null>;
  /** Upsert on (learnerId, scenarioId) — the aggregate is one row. */
  save(run: Investigation): Promise<void>;
  findAllForLearner(learnerId: string): Promise<Investigation[]>;
}
