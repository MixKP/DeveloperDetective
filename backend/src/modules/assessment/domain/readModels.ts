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
}

export interface KnowledgeTestContent {
  id: number;
  slug: string;
  variant: TestVariant;
  title: string;
  description: string;
  questions: TestQuestionContent[];
}

/**
 * The verdict for one answered question. `feedback` belongs to the option the
 * learner picked, which is how a wrong answer gets told which principle it
 * breached rather than merely that it was wrong.
 */
export interface GradedAnswerContent {
  questionId: number;
  selectedOption: string;
  correctOption: string;
  correct: boolean;
  principle: EthicsPrinciple;
  clause: string;
  feedback: string;
  explanation: string;
}
