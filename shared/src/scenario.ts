import { z } from 'zod';
import {
  questionKindSchema,
  severitySchema,
  stageSchema,
  ethicalQualitySchema,
} from './primitives.js';

/**
 * SANITIZED CONTRACT.
 *
 * These schemas describe what the API is allowed to send the browser. Several fields that
 * exist in the database are deliberately absent, and their absence is a security property
 * rather than an oversight:
 *
 *   Question.correctOption   never sent, in any response, ever
 *   Question.explanation     only sent alongside a correct answer
 *   Question.hints           only the text the learner has already paid for
 *   File.vulnerableLines     empty until a `locate` question has been solved
 *   EthicalChoice.quality    only sent after the learner commits to a choice
 *   EthicalChoice.outcome    only sent after the learner commits to a choice
 *   debrief                  null until the quiz is complete
 *
 * `backend/tests/api/answer-key.contract.test.ts` fails the build if any forbidden key
 * appears in a serialized scenario payload.
 */

/** One selectable answer. Carries no signal as to whether it is the right one. */
export const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});
export type QuestionOption = z.infer<typeof questionOptionSchema>;

export const questionViewSchema = z.object({
  id: z.number().int(),
  kind: questionKindSchema,
  prompt: z.string(),
  options: z.array(questionOptionSchema),
  orderIndex: z.number().int(),
  /** How many hints exist. The text of unrevealed hints is not included. */
  hintsTotal: z.number().int().nonnegative(),
  /** Hint text this learner has already unlocked, in order. */
  hintsRevealed: z.array(z.string()),
  solved: z.boolean(),
  /** Populated only once this question has been answered correctly. */
  explanation: z.string().nullable(),
});
export type QuestionView = z.infer<typeof questionViewSchema>;

export const codeFileSchema = z.object({
  id: z.number().int(),
  path: z.string(),
  language: z.string(),
  code: z.string(),
  /**
   * An honest signal: this file was touched by the deploy under investigation. It is NOT a
   * "this file is vulnerable" flag — that would hand the learner the answer for free.
   */
  recentlyChanged: z.boolean(),
  /** Empty until the learner solves a `locate` question. Enforced server-side. */
  vulnerableLines: z.array(z.number().int().positive()),
});
export type CodeFile = z.infer<typeof codeFileSchema>;

export const incidentBriefSchema = z.object({
  sender: z.string(),
  senderRole: z.string(),
  subject: z.string(),
  receivedAt: z.string(),
  body: z.string(),
  objectives: z.array(z.string()),
});
export type IncidentBrief = z.infer<typeof incidentBriefSchema>;

/** Pre-choice view: option text only. Quality and outcome stay on the server. */
export const ethicalChoiceViewSchema = z.object({
  id: z.number().int(),
  text: z.string(),
});
export type EthicalChoiceView = z.infer<typeof ethicalChoiceViewSchema>;

/** Post-choice view: the consequence, returned once the learner commits. */
export const ethicalOutcomeSchema = z.object({
  choiceId: z.number().int(),
  quality: ethicalQualitySchema,
  outcome: z.string(),
});
export type EthicalOutcome = z.infer<typeof ethicalOutcomeSchema>;

export const debriefSchema = z.object({
  rootCause: z.string(),
  businessImpact: z.string(),
  remediation: z.string(),
});
export type Debrief = z.infer<typeof debriefSchema>;

/**
 * Scoring parameters, served by the backend from its own domain constants so the UI can say
 * "this hint costs 10 points" without hardcoding — or duplicating — the rule itself.
 */
export const scoringInfoSchema = z.object({
  base: z.number().int(),
  hintPenalty: z.number().int(),
  wrongAttemptPenalty: z.number().int(),
  floor: z.number().int(),
});
export type ScoringInfo = z.infer<typeof scoringInfoSchema>;

/** Per-scenario progress as the learner's client should see it. */
export const investigationStateSchema = z.object({
  score: z.number().int(),
  hintsUsed: z.number().int().nonnegative(),
  wrongAttempts: z.number().int().nonnegative(),
  solvedQuestionIds: z.array(z.number().int()),
  vulnerableLinesUnlocked: z.boolean(),
  quizComplete: z.boolean(),
  completed: z.boolean(),
  stage: stageSchema,
  ethicalChoiceId: z.number().int().nullable(),
});
export type InvestigationState = z.infer<typeof investigationStateSchema>;

/** Dashboard card. */
export const scenarioSummarySchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  severity: severitySchema,
  tags: z.array(z.string()),
  estimatedMinutes: z.number().int().positive(),
  language: z.string(),
  /** Null when this learner has not opened the case yet. */
  state: investigationStateSchema.nullable(),
});
export type ScenarioSummary = z.infer<typeof scenarioSummarySchema>;

export const scenarioListResponseSchema = z.object({
  scenarios: z.array(scenarioSummarySchema),
});
export type ScenarioListResponse = z.infer<typeof scenarioListResponseSchema>;

export const scenarioDetailResponseSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  severity: severitySchema,
  tags: z.array(z.string()),
  estimatedMinutes: z.number().int().positive(),
  language: z.string(),
  brief: incidentBriefSchema,
  files: z.array(codeFileSchema),
  questions: z.array(questionViewSchema),
  ethicalChoices: z.array(ethicalChoiceViewSchema),
  /** Null until the quiz is complete — the root cause is, after all, the answer. */
  debrief: debriefSchema.nullable(),
  /** The consequence of the choice already made, if any. */
  ethicalOutcome: ethicalOutcomeSchema.nullable(),
  scoring: scoringInfoSchema,
  state: investigationStateSchema,
});
export type ScenarioDetailResponse = z.infer<typeof scenarioDetailResponseSchema>;
