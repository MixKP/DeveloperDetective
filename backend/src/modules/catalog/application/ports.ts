import type {
  AnswerVerdict,
  DebriefContent,
  EthicalOutcomeContent,
  QuestionContent,
  ScenarioContent,
  ScenarioSummaryContent,
} from '../domain/readModels.js';

export interface ScenarioCatalog {
  listSummaries(): Promise<ScenarioSummaryContent[]>;
  findById(scenarioId: number): Promise<ScenarioContent | null>;
  findQuestion(questionId: number): Promise<QuestionContent | null>;
  countQuestions(scenarioId: number): Promise<number>;
  hasEthicalChoice(scenarioId: number, choiceId: number): Promise<boolean>;
}

export interface AnswerKey {
  checkAnswer(questionId: number, optionId: string): Promise<AnswerVerdict | null>;

  hintAt(questionId: number, index: number): Promise<string | null>;

  revealedHints(questionId: number, count: number): Promise<string[]>;

  explanationFor(questionId: number): Promise<string | null>;

  vulnerableLines(scenarioId: number): Promise<Record<string, number[]>>;

  debrief(scenarioId: number): Promise<DebriefContent | null>;

  ethicalOutcome(choiceId: number): Promise<EthicalOutcomeContent | null>;
}
