import type {
  AnswerVerdict,
  DebriefContent,
  EthicalOutcomeContent,
  QuestionContent,
  ScenarioContent,
  ScenarioSummaryContent,
} from '../domain/readModels.js';

/** Public, unprotected scenario content. Safe to hand to anyone. */
export interface ScenarioCatalog {
  listSummaries(): Promise<ScenarioSummaryContent[]>;
  findById(scenarioId: number): Promise<ScenarioContent | null>;
  findQuestion(questionId: number): Promise<QuestionContent | null>;
  countQuestions(scenarioId: number): Promise<number>;
  hasEthicalChoice(scenarioId: number, choiceId: number): Promise<boolean>;
}

/**
 * THE ANSWER KEY BOUNDARY — the centrepiece of the architecture.
 *
 * This port answers questions; it does not hand over secrets. There is deliberately no
 * `getCorrectOption()` and no `getAllHints()`. The investigation module, which grades and
 * scores, therefore cannot obtain the correct option even in process memory — the method
 * simply does not exist.
 *
 * That makes the answer-key protection a consequence of dependency inversion rather than of
 * someone remembering to delete a field before serializing. It also means the protection
 * survives refactors: a new endpoint cannot leak what it cannot reach.
 *
 * If catalog ever becomes its own service, an HTTP client implementing this same interface
 * drops straight in and nothing in investigation changes.
 */
export interface AnswerKey {
  /** Grade one answer. Returns null when the question does not exist. */
  checkAnswer(questionId: number, optionId: string): Promise<AnswerVerdict | null>;

  /** One hint, by index. Null when the index is out of range. */
  hintAt(questionId: number, index: number): Promise<string | null>;

  /** The first `count` hints — for rebuilding the view of hints already paid for. */
  revealedHints(questionId: number, count: number): Promise<string[]>;

  /** The explanation for a question, for replaying one the learner has already solved. */
  explanationFor(questionId: number): Promise<string | null>;

  /** filePath → line numbers. Callers must check the reveal rule before asking. */
  vulnerableLines(scenarioId: number): Promise<Record<string, number[]>>;

  /** Root cause, impact, remediation. This is the answer in prose, so it is gated too. */
  debrief(scenarioId: number): Promise<DebriefContent | null>;

  /** The consequence of an ethical choice, revealed only once the learner commits. */
  ethicalOutcome(choiceId: number): Promise<EthicalOutcomeContent | null>;
}
