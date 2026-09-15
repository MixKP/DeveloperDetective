import type { ContentCache } from '../../../platform/cache/ContentCache.js';
import type { ScenarioCatalog } from '../application/ports.js';
import type {
  QuestionContent,
  ScenarioContent,
  ScenarioSummaryContent,
} from '../domain/readModels.js';

/**
 * The catalog, memoised. A decorator rather than caching inside the Drizzle
 * adapter: what to cache is a deployment concern, and the adapter should stay the
 * plain translation of a port into SQL.
 */
export class CachedScenarioCatalog implements ScenarioCatalog {
  constructor(
    private readonly inner: ScenarioCatalog,
    private readonly cache: ContentCache,
  ) {}

  listSummaries(): Promise<ScenarioSummaryContent[]> {
    return this.cache.get('scenarios:summaries', () => this.inner.listSummaries());
  }

  countScenarios(): Promise<number> {
    return this.cache.get('scenarios:count', () => this.inner.countScenarios());
  }

  findById(scenarioId: number): Promise<ScenarioContent | null> {
    return this.cache.get(`scenario:${scenarioId}`, () => this.inner.findById(scenarioId));
  }

  findQuestion(questionId: number): Promise<QuestionContent | null> {
    return this.cache.get(`question:${questionId}`, () => this.inner.findQuestion(questionId));
  }

  countQuestions(scenarioId: number): Promise<number> {
    return this.cache.get(`scenario:${scenarioId}:questions`, () =>
      this.inner.countQuestions(scenarioId),
    );
  }

  hasEthicalChoice(scenarioId: number, choiceId: number): Promise<boolean> {
    return this.cache.get(`scenario:${scenarioId}:choice:${choiceId}`, () =>
      this.inner.hasEthicalChoice(scenarioId, choiceId),
    );
  }
}
