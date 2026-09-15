import type { ContentCache } from '../../platform/cache/ContentCache.js';
import type { Database } from '../../platform/db/client.js';
import type { AnswerKey, ScenarioCatalog } from './application/ports.js';
import { CachedAnswerKey } from './infrastructure/CachedAnswerKey.js';
import { CachedScenarioCatalog } from './infrastructure/CachedScenarioCatalog.js';
import { DrizzleAnswerKey } from './infrastructure/DrizzleAnswerKey.js';
import { DrizzleScenarioCatalog } from './infrastructure/DrizzleScenarioCatalog.js';

export type { ScenarioCatalog, AnswerKey } from './application/ports.js';
export type {
  AnswerVerdict,
  BriefContent,
  DebriefContent,
  EthicalChoiceContent,
  EthicalOutcomeContent,
  EthicalQuality,
  FileContent,
  QuestionContent,
  QuestionKind,
  ScenarioContent,
  ScenarioSummaryContent,
  Severity,
} from './domain/readModels.js';

/**
 * Both adapters are wrapped in the same cache: authored content changes together,
 * when the seed runs, so one lifetime covers all of it. Pass no cache and the
 * module reads PostgreSQL on every call, which is what the tests want.
 */
export function createCatalogModule(
  db: Database,
  cache?: ContentCache,
): {
  catalog: ScenarioCatalog;
  answerKey: AnswerKey;
} {
  const catalog = new DrizzleScenarioCatalog(db);
  const answerKey = new DrizzleAnswerKey(db);

  return {
    catalog: cache ? new CachedScenarioCatalog(catalog, cache) : catalog,
    answerKey: cache ? new CachedAnswerKey(answerKey, cache) : answerKey,
  };
}
