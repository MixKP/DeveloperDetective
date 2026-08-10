import type { Database } from '../../platform/db/client.js';
import type { AnswerKey, ScenarioCatalog } from './application/ports.js';
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

export function createCatalogModule(db: Database): {
  catalog: ScenarioCatalog;
  answerKey: AnswerKey;
} {
  return {
    catalog: new DrizzleScenarioCatalog(db),
    answerKey: new DrizzleAnswerKey(db),
  };
}
