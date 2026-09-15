export type TestVariant = 'pre' | 'post';

export type EthicsPrinciple =
  | 'public'
  | 'client-and-employer'
  | 'product'
  | 'judgement'
  | 'management'
  | 'profession'
  | 'colleagues'
  | 'self';

export interface TestOptionContent {
  id: string;
  text: string;
}

export interface TestQuestionContent {
  id: number;
  prompt: string;
  options: TestOptionContent[];
  orderIndex: number;
  /**
   * Which principle the question turns on. Used to draw a sitting that covers the
   * Code and to group the review afterwards — never sent to the browser before an
   * answer, since naming the principle is half of naming the answer.
   */
  principle: EthicsPrinciple;
}

export interface KnowledgeTestContent {
  id: number;
  slug: string;
  variant: TestVariant;
  title: string;
  description: string;
  /** How many of the questions below one sitting asks. */
  questionsPerAttempt: number;
  /** What to revise, per principle, shown when a sitting missed one. */
  guidance: Partial<Record<EthicsPrinciple, string>>;
  questions: TestQuestionContent[];
}

export interface MissedPrincipleContent {
  principle: EthicsPrinciple;
  questionIds: number[];
  guidance: string;
}

export interface AttemptSummaryContent {
  verdict: string;
  missed: MissedPrincipleContent[];
  mastered: EthicsPrinciple[];
}

/**
 * The verdict for one answered question. `feedback` belongs to the option the
 * learner picked, which is how a wrong answer gets told which principle it
 * breached rather than merely that it was wrong.
 */
export interface GradedAnswerContent {
  questionId: number;
  prompt: string;
  selectedOption: string;
  selectedText: string;
  correctOption: string;
  correct: boolean;
  principle: EthicsPrinciple;
  clause: string;
  feedback: string;
  explanation: string;
}
