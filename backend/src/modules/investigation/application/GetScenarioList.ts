import type { ScenarioListResponse } from '@dd/shared';
import type { ScenarioCatalog } from '../../catalog/index.js';
import type { InvestigationRepository } from './ports.js';
import { toInvestigationState } from './toState.js';

/** Dashboard cards, each carrying this learner's state or null if they never opened it. */
export class GetScenarioList {
  constructor(
    private readonly catalog: ScenarioCatalog,
    private readonly investigations: InvestigationRepository,
  ) {}

  async execute(learnerId: string): Promise<ScenarioListResponse> {
    const summaries = await this.catalog.listSummaries();
    const runs = await this.investigations.findAllForLearner(learnerId);
    const byScenario = new Map(runs.map((r) => [r.scenarioId, r]));

    return {
      scenarios: summaries.map((s) => {
        const run = byScenario.get(s.id);
        return {
          id: s.id,
          slug: s.slug,
          title: s.title,
          summary: s.summary,
          severity: s.severity,
          tags: s.tags,
          estimatedMinutes: s.estimatedMinutes,
          language: s.language,
          state: run ? toInvestigationState(run, s.questionCount) : null,
        };
      }),
    };
  }
}
