import type {
  AnswerKey,
  AnswerVerdict,
  DebriefContent,
  EthicalOutcomeContent,
  QuestionContent,
  ScenarioCatalog,
  ScenarioContent,
  ScenarioSummaryContent,
} from '../../src/modules/catalog/index.js';
import {
  Attempt,
  type AttemptRepository,
  type GradedAnswerContent,
  type KnowledgeTestCatalog,
  type KnowledgeTestContent,
  type SelectedOption,
  type TestAnswerKey,
  type TestVariant,
} from '../../src/modules/assessment/index.js';
import { Investigation } from '../../src/modules/investigation/domain/Investigation.js';
import type { InvestigationRepository } from '../../src/modules/investigation/application/ports.js';

export const SCENARIO_ID = 1;
export const LOCATE_Q = 101;
export const EXPLAIN_Q = 102;
export const SOLVE_Q = 103;
export const TOTAL_QUESTIONS = 3;
export const GOOD_CHOICE = 501;
export const BAD_CHOICE = 502;
export const LEARNER = '3f9f1a3e-6a4e-4f2b-9c3d-1a2b3c4d5e6f';

const ANSWER_KEY_DATA: Record<
  number,
  { correct: string; explanation: string; hints: string[]; kind: QuestionContent['kind'] }
> = {
  [LOCATE_Q]: {
    correct: 'b',
    explanation: 'The query is built by string concatenation on line 42.',
    hints: ['Look at how the query is built.', 'Check auth.service.ts.', 'Line 42.'],
    kind: 'locate',
  },
  [EXPLAIN_Q]: {
    correct: 'a',
    explanation: "A quote closes the literal and OR '1'='1' makes the predicate always true.",
    hints: ['What happens to a quote inside the input?'],
    kind: 'explain',
  },
  [SOLVE_Q]: {
    correct: 'c',
    explanation: 'Parameterized queries keep data out of the SQL grammar entirely.',
    hints: ['Escaping is a blocklist. What is the allowlist equivalent?'],
    kind: 'solve',
  },
};

const QUESTIONS: QuestionContent[] = [
  {
    id: LOCATE_Q,
    scenarioId: SCENARIO_ID,
    kind: 'locate',
    prompt: 'Which file and line introduces the vulnerability?',
    options: [
      { id: 'a', text: 'routes/index.ts line 8' },
      { id: 'b', text: 'auth.service.ts line 42' },
      { id: 'c', text: 'db/pool.ts line 5' },
    ],
    orderIndex: 0,
    hintsTotal: 3,
  },
  {
    id: EXPLAIN_Q,
    scenarioId: SCENARIO_ID,
    kind: 'explain',
    prompt: "Why does ' OR '1'='1 bypass the check?",
    options: [
      { id: 'a', text: 'It makes the WHERE clause always true' },
      { id: 'b', text: 'It overflows the buffer' },
    ],
    orderIndex: 1,
    hintsTotal: 1,
  },
  {
    id: SOLVE_Q,
    scenarioId: SCENARIO_ID,
    kind: 'solve',
    prompt: 'What is the correct fix?',
    options: [
      { id: 'a', text: 'Strip quotes from the input' },
      { id: 'b', text: 'Block the word OR' },
      { id: 'c', text: 'Use a parameterized query' },
    ],
    orderIndex: 2,
    hintsTotal: 1,
  },
];

const SUMMARY: ScenarioSummaryContent = {
  id: SCENARIO_ID,
  slug: 'sql-injection-auth-bypass',
  title: 'Authentication bypass in the login service',
  summary: 'Support reports accounts accessed without the right password.',
  severity: 'Critical',
  tags: ['sql-injection', 'authentication'],
  estimatedMinutes: 25,
  language: 'typescript',
  questionCount: TOTAL_QUESTIONS,
};

const CONTENT: ScenarioContent = {
  ...SUMMARY,
  brief: {
    sender: 'Priya Raman',
    senderRole: 'Head of Support',
    subject: 'Urgent: accounts accessed without correct password',
    receivedAt: '2026-08-10T08:14:00.000Z',
    body: 'Three customers report their accounts were accessed overnight.',
    objectives: ['Find the defect', 'Explain the impact', 'Propose the fix'],
  },
  files: [
    {
      id: 1,
      path: 'src/auth.service.ts',
      language: 'typescript',
      code: 'const q = `SELECT * FROM users WHERE email = "${email}"`;',
      recentlyChanged: true,
      previousCode: 'const q = queryUser(email);',
    },
    {
      id: 2,
      path: 'src/db/pool.ts',
      language: 'typescript',
      code: 'export const pool = createPool(config);',
      recentlyChanged: false,
      previousCode: null,
    },
  ],
  questions: QUESTIONS,
  ethicalChoices: [
    { id: GOOD_CHOICE, scenarioId: SCENARIO_ID, text: 'Hold the release and fix it properly.' },
    { id: BAD_CHOICE, scenarioId: SCENARIO_ID, text: 'Ship it and patch on Monday.' },
  ],
};

export class StubCatalog implements ScenarioCatalog {
  async listSummaries(): Promise<ScenarioSummaryContent[]> {
    return [SUMMARY];
  }
  async findById(scenarioId: number): Promise<ScenarioContent | null> {
    return scenarioId === SCENARIO_ID ? CONTENT : null;
  }
  async findQuestion(questionId: number): Promise<QuestionContent | null> {
    return QUESTIONS.find((q) => q.id === questionId) ?? null;
  }
  async countQuestions(scenarioId: number): Promise<number> {
    return scenarioId === SCENARIO_ID ? TOTAL_QUESTIONS : 0;
  }
  async hasEthicalChoice(scenarioId: number, choiceId: number): Promise<boolean> {
    return scenarioId === SCENARIO_ID && [GOOD_CHOICE, BAD_CHOICE].includes(choiceId);
  }
}

export class StubAnswerKey implements AnswerKey {
  async checkAnswer(questionId: number, optionId: string): Promise<AnswerVerdict | null> {
    const entry = ANSWER_KEY_DATA[questionId];
    if (!entry) return null;
    const correct = entry.correct === optionId;
    return { correct, explanation: correct ? entry.explanation : null, kind: entry.kind };
  }
  async hintAt(questionId: number, index: number): Promise<string | null> {
    return ANSWER_KEY_DATA[questionId]?.hints[index] ?? null;
  }
  async revealedHints(questionId: number, count: number): Promise<string[]> {
    return (ANSWER_KEY_DATA[questionId]?.hints ?? []).slice(0, count);
  }
  async explanationFor(questionId: number): Promise<string | null> {
    return ANSWER_KEY_DATA[questionId]?.explanation ?? null;
  }
  async vulnerableLines(scenarioId: number): Promise<Record<string, number[]>> {
    return scenarioId === SCENARIO_ID ? { 'src/auth.service.ts': [42, 43] } : {};
  }
  async debrief(scenarioId: number): Promise<DebriefContent | null> {
    return scenarioId === SCENARIO_ID
      ? {
          rootCause: 'User input was concatenated into a SQL string.',
          businessImpact: 'Any account could be accessed without a password.',
          remediation: 'Use parameterized queries and rotate affected sessions.',
        }
      : null;
  }
  async ethicalOutcome(choiceId: number): Promise<EthicalOutcomeContent | null> {
    if (choiceId === GOOD_CHOICE) {
      return {
        choiceId,
        quality: 'good',
        outcome: 'The release slipped two days. No customer data was exposed.',
      };
    }
    if (choiceId === BAD_CHOICE) {
      return {
        choiceId,
        quality: 'bad',
        outcome: 'The weekend brought a breach and a disclosure notice.',
      };
    }
    return null;
  }
}

export class InMemoryInvestigationRepository implements InvestigationRepository {
  private readonly rows = new Map<string, Investigation>();
  saveCount = 0;

  private key(learnerId: string, scenarioId: number) {
    return `${learnerId}:${scenarioId}`;
  }

  async find(learnerId: string, scenarioId: number): Promise<Investigation | null> {
    return this.rows.get(this.key(learnerId, scenarioId)) ?? null;
  }

  async save(run: Investigation): Promise<void> {
    this.saveCount += 1;
    this.rows.set(this.key(run.learnerId, run.scenarioId), run);
  }

  async findAllForLearner(learnerId: string): Promise<Investigation[]> {
    return [...this.rows.values()].filter((r) => r.learnerId === learnerId);
  }
}

/**
 * A case this learner has already closed. The post-test is gated on there being one, so
 * every test about the test itself starts from a repository holding this.
 */
export function closedCase(learnerId = LEARNER): Investigation {
  return Investigation.fromSnapshot({
    learnerId,
    scenarioId: SCENARIO_ID,
    solvedQuestionIds: [LOCATE_Q, EXPLAIN_Q, SOLVE_Q],
    revealedHints: {},
    wrongAttempts: 0,
    vulnerableLinesUnlocked: true,
    ethicalChoiceId: GOOD_CHOICE,
    completed: true,
    startedAt: new Date('2026-09-01T09:00:00.000Z'),
    completedAt: new Date('2026-09-01T09:30:00.000Z'),
  });
}

export const TEST_ID = 9;
export const TEST_Q1 = 901;
export const TEST_Q2 = 902;
export const TEST_Q3 = 903;
export const TEST_Q4 = 904;
/** One sitting asks two of the four, so a retake has somewhere fresh to go. */
export const QUESTIONS_PER_ATTEMPT = 2;

interface StubQuestion {
  correctOption: string;
  principle: GradedAnswerContent['principle'];
  clause: string;
  prompt: string;
  explanation: string;
  options: { id: string; text: string; feedback: string }[];
}

const TEST_KEY: Record<number, StubQuestion> = {
  [TEST_Q1]: {
    correctOption: 'b',
    principle: 'public',
    clause: '1.04',
    prompt: 'Disclose the breach, or wait for the announcement?',
    explanation: 'Disclosure comes before the fix.',
    options: [
      { id: 'a', text: 'Wait for the announcement.', feedback: 'Breaches Principle 1 (Public).' },
      { id: 'b', text: 'Disclose it immediately.', feedback: 'Correct. Principle 1 (Public).' },
    ],
  },
  [TEST_Q2]: {
    correctOption: 'a',
    principle: 'product',
    clause: '3.10',
    prompt: 'The key is rotated. What else does the incident need?',
    explanation: 'Rotation does not undo the harm already done.',
    options: [
      { id: 'a', text: 'Assess what was accessed.', feedback: 'Correct. Principle 3 (Product).' },
      { id: 'b', text: 'Close the ticket.', feedback: 'Breaches Principle 3 (Product).' },
    ],
  },
  [TEST_Q3]: {
    correctOption: 'a',
    principle: 'public',
    clause: '1.03',
    prompt: 'Sign off a release with a live exposure?',
    explanation: 'Approval is withheld while a known danger is live.',
    options: [
      { id: 'a', text: 'Withhold approval.', feedback: 'Correct. Principle 1 (Public).' },
      { id: 'b', text: 'Ship it behind a beta label.', feedback: 'Breaches Principle 1 (Public).' },
    ],
  },
  [TEST_Q4]: {
    correctOption: 'b',
    principle: 'product',
    clause: '3.13',
    prompt: 'Restore production data into staging to reproduce a bug?',
    explanation: 'Debugging needs the shape of the data, not the people in it.',
    options: [
      {
        id: 'a',
        text: 'Restore it and delete it after.',
        feedback: 'Breaches Principle 3 (Product).',
      },
      {
        id: 'b',
        text: 'Generate data with the failing shape.',
        feedback: 'Correct. Principle 3 (Product).',
      },
    ],
  },
};

const KNOWLEDGE_TEST: KnowledgeTestContent = {
  id: TEST_ID,
  slug: 'core-professional-ethics',
  variant: 'post',
  title: 'Core professional ethics',
  description: 'Two questions a sitting, drawn from four.',
  questionsPerAttempt: QUESTIONS_PER_ATTEMPT,
  guidance: {
    public: 'Re-read Principle 1: disclosure comes before the schedule.',
    product: 'Re-read Principle 3: the deliverable includes the data it touches.',
  },
  questions: [TEST_Q1, TEST_Q2, TEST_Q3, TEST_Q4].map((id, index) => ({
    id,
    prompt: TEST_KEY[id]!.prompt,
    orderIndex: index,
    principle: TEST_KEY[id]!.principle,
    options: TEST_KEY[id]!.options.map((o) => ({ id: o.id, text: o.text })),
  })),
};

/** The option this stub grades as correct, for a test that wants to score a sitting. */
export const correctOptionFor = (questionId: number): string =>
  TEST_KEY[questionId]?.correctOption ?? 'a';

/** A real option that is not the right one — a wrong answer, not an unanswered question. */
export const wrongOptionFor = (questionId: number): string => {
  const question = TEST_KEY[questionId];
  return question?.options.find((o) => o.id !== question.correctOption)?.id ?? 'a';
};

export class StubKnowledgeTestCatalog implements KnowledgeTestCatalog {
  async findByVariant(variant: TestVariant): Promise<KnowledgeTestContent | null> {
    return variant === 'post' ? KNOWLEDGE_TEST : null;
  }
}

export class StubTestAnswerKey implements TestAnswerKey {
  async grade(testId: number, selections: SelectedOption[]): Promise<GradedAnswerContent[]> {
    if (testId !== TEST_ID) return [];
    return selections.flatMap((selection) => {
      const entry = TEST_KEY[selection.questionId];
      if (!entry) return [];
      const chosen = entry.options.find((o) => o.id === selection.optionId);
      return [
        {
          questionId: selection.questionId,
          prompt: entry.prompt,
          selectedOption: selection.optionId,
          selectedText: chosen?.text ?? '',
          correctOption: entry.correctOption,
          correct: entry.correctOption === selection.optionId,
          principle: entry.principle,
          clause: entry.clause,
          feedback: chosen?.feedback ?? 'No option was selected for this question.',
          explanation: entry.explanation,
        },
      ];
    });
  }
}

export class InMemoryAttemptRepository implements AttemptRepository {
  private readonly rows: Attempt[] = [];

  async history(learnerId: string, testId: number): Promise<Attempt[]> {
    return this.rows
      .filter((row) => row.learnerId === learnerId && row.testId === testId)
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
  }

  async save(attempt: Attempt): Promise<void> {
    const clash = this.rows.some(
      (row) =>
        row.learnerId === attempt.learnerId &&
        row.testId === attempt.testId &&
        row.attemptNumber === attempt.attemptNumber,
    );
    // The same refusal the unique constraint produces, so tests see the real rule.
    if (clash) Attempt.rejectDuplicateSitting();
    this.rows.push(attempt);
  }
}

/**
 * The assessment half of `ApiDeps`. Spread into `createApiApp` by every API test,
 * so a test about investigation endpoints does not have to care about this module.
 */
export const assessmentDeps = () => ({
  tests: new StubKnowledgeTestCatalog(),
  testAnswerKey: new StubTestAnswerKey(),
  attempts: new InMemoryAttemptRepository(),
});
