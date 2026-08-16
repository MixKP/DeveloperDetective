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
  recentlyChanged: boolean;
  /**
   * Lines the incident's deploy touched. Unlike vulnerableLines this is not part of
   * the answer key — it says where to look, not what is wrong — so it ships with the
   * file from the moment the learner opens the case.
   */
  changedLines: number[];
}

export interface QuestionContent {
  id: number;
  scenarioId: number;
  kind: QuestionKind;
  prompt: string;
  options: { id: string; text: string }[];
  orderIndex: number;
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

export interface AnswerVerdict {
  correct: boolean;
  explanation: string | null;
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
