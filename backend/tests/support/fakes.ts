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
import type { Investigation } from '../../src/modules/investigation/domain/Investigation.js';
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
    },
    {
      id: 2,
      path: 'src/db/pool.ts',
      language: 'typescript',
      code: 'export const pool = createPool(config);',
      recentlyChanged: false,
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
