import { z } from 'zod';
import {
  questionKindSchema,
  severitySchema,
  stageSchema,
  ethicalQualitySchema,
} from './primitives.js';

export const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const questionViewSchema = z.object({
  id: z.number().int(),
  kind: questionKindSchema,
  prompt: z.string(),
  options: z.array(questionOptionSchema),
  orderIndex: z.number().int(),
  hintsTotal: z.number().int().nonnegative(),
  hintsRevealed: z.array(z.string()),
  solved: z.boolean(),
  explanation: z.string().nullable(),
});
export type QuestionView = z.infer<typeof questionViewSchema>;

export const codeFileSchema = z.object({
  id: z.number().int(),
  path: z.string(),
  language: z.string(),
  code: z.string(),
  recentlyChanged: z.boolean(),
  previousCode: z.string().nullable(),
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

export const ethicalChoiceViewSchema = z.object({
  id: z.number().int(),
  text: z.string(),
});
export type EthicalChoiceView = z.infer<typeof ethicalChoiceViewSchema>;

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

export const scoringInfoSchema = z.object({
  base: z.number().int(),
  hintPenalty: z.number().int(),
  wrongAttemptPenalty: z.number().int(),
  floor: z.number().int(),
});
export type ScoringInfo = z.infer<typeof scoringInfoSchema>;

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

export const scenarioSummarySchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  severity: severitySchema,
  tags: z.array(z.string()),
  estimatedMinutes: z.number().int().positive(),
  language: z.string(),
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
  debrief: debriefSchema.nullable(),
  ethicalOutcome: ethicalOutcomeSchema.nullable(),
  scoring: scoringInfoSchema,
  state: investigationStateSchema,
});
export type ScenarioDetailResponse = z.infer<typeof scenarioDetailResponseSchema>;
