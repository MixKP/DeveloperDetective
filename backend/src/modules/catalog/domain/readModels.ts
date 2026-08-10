/**
 * Catalog read models.
 *
 * Scenario content is reference data seeded from JSON: it has no invariants, no lifecycle,
 * and nothing to protect from itself. So it gets read models rather than entities with
 * behaviour — a `Scenario` class with no rules would be an anemic object with extra steps.
 *
 * NOTE WHAT IS NOT HERE. These models carry no correct answers, no hint text, no vulnerable
 * line numbers, and no debrief. All of that is reachable only through the `AnswerKey` port,
 * which returns verdicts and gated content rather than secrets in bulk. A caller holding a
 * `ScenarioContent` therefore cannot leak an answer key even by accident.
 */

export type Severity = 'Critical' | 'High' | 'Medium';
export type QuestionKind = 'locate' | 'explain' | 'solve';
export type EthicalQuality = 'good' | 'neutral' | 'bad';

export interface ScenarioSummaryContent {
  id: number;
  slug: string;
  title: string;
  summary: string;
  severity: Severity;
  tags: string[];
  estimatedMinutes: number;
  language: string;
  /**
   * Carried on the summary so the dashboard can compute a learner's stage for every
   * scenario without an extra query per card.
   */
  questionCount: number;
}

export interface BriefContent {
  sender: string;
  senderRole: string;
  subject: string;
  receivedAt: string;
  body: string;
  objectives: string[];
}

export interface FileContent {
  id: number;
  path: string;
  language: string;
  code: string;
  /** Touched by the deploy under investigation — an honest lead, not a "bug is here" flag. */
  recentlyChanged: boolean;
}

export interface QuestionContent {
  id: number;
  scenarioId: number;
  kind: QuestionKind;
  prompt: string;
  options: { id: string; text: string }[];
  orderIndex: number;
  /** How many hints exist. The text itself comes from AnswerKey, one purchase at a time. */
  hintsTotal: number;
}

export interface EthicalChoiceContent {
  id: number;
  scenarioId: number;
  text: string;
}

export interface ScenarioContent extends ScenarioSummaryContent {
  brief: BriefContent;
  files: FileContent[];
  questions: QuestionContent[];
  ethicalChoices: EthicalChoiceContent[];
}

// --- Gated content, returned only through the AnswerKey port -------------------

export interface AnswerVerdict {
  correct: boolean;
  /** Present only on a correct answer. */
  explanation: string | null;
  /** The asking question's kind, so the caller can apply the reveal rule. */
  kind: QuestionKind;
}

export interface DebriefContent {
  rootCause: string;
  businessImpact: string;
  remediation: string;
}

export interface EthicalOutcomeContent {
  choiceId: number;
  quality: EthicalQuality;
  outcome: string;
}
