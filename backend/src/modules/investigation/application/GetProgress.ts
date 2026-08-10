import type { ProgressRecord, ProgressResponse } from '@dd/shared';
import type { ScenarioCatalog } from '../../catalog/index.js';
import type { InvestigationRepository } from './ports.js';
import { toInvestigationState } from './toState.js';

/** Progress records plus the dashboard stat tiles. */
export class GetProgress {
  constructor(
    private readonly catalog: ScenarioCatalog,
    private readonly investigations: InvestigationRepository,
  ) {}

  async execute(learnerId: string): Promise<ProgressResponse> {
    const summaries = await this.catalog.listSummaries();
    const byId = new Map(summaries.map((s) => [s.id, s]));
    const runs = await this.investigations.findAllForLearner(learnerId);

    const records: ProgressRecord[] = [];
    for (const run of runs) {
      const scenario = byId.get(run.scenarioId);
      // A run whose scenario has since been removed from the catalog is skipped rather
      // than crashing the dashboard.
      if (!scenario) continue;
      records.push({
        scenarioId: run.scenarioId,
        scenarioSlug: scenario.slug,
        scenarioTitle: scenario.title,
        state: toInvestigationState(run, scenario.questionCount),
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
      });
    }

    const completedRuns = records.filter((r) => r.state.completed);
    // Averaged over finished cases only: including a case still in progress would drag the
    // number down for work the learner has not had a chance to finish.
    const averageScore =
      completedRuns.length > 0
        ? Math.round(
            completedRuns.reduce((sum, r) => sum + r.state.score, 0) / completedRuns.length,
          )
        : null;

    return {
      records,
      stats: {
        casesSolved: completedRuns.length,
        casesStarted: records.length,
        averageScore,
        hintsUsed: records.reduce((sum, r) => sum + r.state.hintsUsed, 0),
      },
    };
  }
}
