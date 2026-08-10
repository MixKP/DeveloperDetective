/**
 * catalog — public API.
 *
 * This file is the module's only front door. ESLint blocks every import that reaches past it
 * (see eslint.config.mjs), including from the composition root, which is why the module wires
 * its own internals through a factory rather than exposing its repositories.
 *
 * Catalog has no interface layer and serves no HTTP routes of its own. Every learner-facing
 * endpoint is gated by run state — which questions are solved, whether the quiz is finished —
 * and that state belongs to `investigation`. Rather than have catalog ask investigation about
 * a learner (inverting the natural dependency), investigation owns the endpoints and calls
 * catalog for content. Catalog is a content provider, not a web module.
 */
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
