import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnswerResponse, ScenarioDetailResponse } from '@dd/shared';

const getScenario = vi.fn();
const answer = vi.fn();
const hint = vi.fn();

vi.mock('@/api/client', () => ({
  api: {
    getScenario: (...args: unknown[]) => getScenario(...args),
    answer: (...args: unknown[]) => answer(...args),
    hint: (...args: unknown[]) => hint(...args),
    listScenarios: vi.fn(),
    submitProgress: vi.fn(),
    getProgress: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const { useScenariosStore } = await import('@/stores/scenarios');

const state = (over: Partial<ScenarioDetailResponse['state']> = {}) => ({
  score: 100,
  hintsUsed: 0,
  wrongAttempts: 0,
  solvedQuestionIds: [],
  vulnerableLinesUnlocked: false,
  quizComplete: false,
  completed: false,
  stage: 'investigate' as const,
  ethicalChoiceId: null,
  ...over,
});

const detail = (over: Partial<ScenarioDetailResponse> = {}): ScenarioDetailResponse =>
  ({
    id: 1,
    slug: 'sql-injection-auth-bypass',
    title: 'Case',
    summary: 'Summary',
    severity: 'Critical',
    tags: [],
    estimatedMinutes: 20,
    language: 'typescript',
    brief: {
      sender: 'A',
      senderRole: 'B',
      subject: 'C',
      receivedAt: '2026-08-10T00:00:00.000Z',
      body: 'D',
      objectives: ['E'],
    },
    files: [
      {
        id: 1,
        path: 'a.ts',
        language: 'typescript',
        code: 'x',
        recentlyChanged: true,
        vulnerableLines: [],
      },
    ],
    questions: [
      {
        id: 10,
        kind: 'locate',
        prompt: 'q1',
        options: [{ id: 'a', text: 'a' }],
        orderIndex: 0,
        hintsTotal: 1,
        hintsRevealed: [],
        solved: false,
        explanation: null,
      },
      {
        id: 11,
        kind: 'solve',
        prompt: 'q2',
        options: [{ id: 'a', text: 'a' }],
        orderIndex: 1,
        hintsTotal: 1,
        hintsRevealed: [],
        solved: false,
        explanation: null,
      },
    ],
    ethicalChoices: [{ id: 20, text: 'choice' }],
    debrief: null,
    ethicalOutcome: null,
    scoring: { base: 100, hintPenalty: 10, wrongAttemptPenalty: 15, floor: 20 },
    state: state(),
    ...over,
  }) as ScenarioDetailResponse;

const answerResult = (over: Partial<AnswerResponse> = {}): AnswerResponse => ({
  correct: true,
  explanation: 'because',
  justUnlockedVulnerableLines: false,
  state: state(),
  ...over,
});

beforeEach(() => {
  setActivePinia(createPinia());
  getScenario.mockReset();
  answer.mockReset();
  hint.mockReset();
});

describe('fetchDetail caching', () => {
  it('does not refetch a scenario already loaded', async () => {
    getScenario.mockResolvedValue(detail());
    const store = useScenariosStore();

    await store.fetchDetail(1);
    await store.fetchDetail(1);

    expect(getScenario).toHaveBeenCalledTimes(1);
  });

  it('refetches when forced', async () => {
    getScenario.mockResolvedValue(detail());
    const store = useScenariosStore();

    await store.fetchDetail(1);
    await store.fetchDetail(1, true);

    expect(getScenario).toHaveBeenCalledTimes(2);
  });
});

describe('gated content invalidates the cached payload', () => {
  /**
   * Regression test.
   *
   * The debrief is null in the payload until the quiz is complete, and the router guard
   * calls fetchDetail() without forcing — which early-returns for a scenario already
   * loaded. So without an explicit refetch when the quiz completes, the learner reaches the
   * debrief screen holding a payload whose `debrief` is still null and sees nothing at all:
   * the root cause, business impact and remediation, which are the entire point of the case.
   */
  it('refetches when the final answer completes the quiz', async () => {
    getScenario.mockResolvedValueOnce(detail()).mockResolvedValueOnce(
      detail({
        debrief: {
          rootCause: 'root',
          businessImpact: 'impact',
          remediation: 'fix',
        },
        state: state({ quizComplete: true, stage: 'debrief' }),
      }),
    );
    answer.mockResolvedValue(
      answerResult({ state: state({ quizComplete: true, stage: 'debrief' }) }),
    );

    const store = useScenariosStore();
    await store.fetchDetail(1);
    expect(store.current?.debrief).toBeNull();

    await store.answer(11, 'a');

    expect(getScenario).toHaveBeenCalledTimes(2);
    expect(store.current?.debrief?.rootCause).toBe('root');
  });

  it('refetches when a locate answer unlocks the vulnerable lines', async () => {
    getScenario.mockResolvedValueOnce(detail()).mockResolvedValueOnce(
      detail({
        files: [
          {
            id: 1,
            path: 'a.ts',
            language: 'typescript',
            code: 'x',
            recentlyChanged: true,
            vulnerableLines: [23, 24],
          },
        ],
      }),
    );
    answer.mockResolvedValue(answerResult({ justUnlockedVulnerableLines: true }));

    const store = useScenariosStore();
    await store.fetchDetail(1);
    await store.answer(10, 'a');

    expect(getScenario).toHaveBeenCalledTimes(2);
    expect(store.current?.files[0]?.vulnerableLines).toEqual([23, 24]);
  });

  it('does not refetch on an ordinary mid-quiz answer', async () => {
    getScenario.mockResolvedValue(detail());
    answer.mockResolvedValue(answerResult());

    const store = useScenariosStore();
    await store.fetchDetail(1);
    await store.answer(10, 'a');

    expect(getScenario).toHaveBeenCalledTimes(1);
    expect(store.current?.questions[0]?.solved).toBe(true);
    expect(store.current?.questions[0]?.explanation).toBe('because');
  });

  it('does not mark a question solved on a wrong answer', async () => {
    getScenario.mockResolvedValue(detail());
    answer.mockResolvedValue(answerResult({ correct: false, explanation: null }));

    const store = useScenariosStore();
    await store.fetchDetail(1);
    await store.answer(10, 'a');

    expect(store.current?.questions[0]?.solved).toBe(false);
    expect(store.current?.questions[0]?.explanation).toBeNull();
  });
});

describe('hints', () => {
  it('appends revealed hint text to the question', async () => {
    getScenario.mockResolvedValue(detail());
    hint.mockResolvedValue({
      hint: 'look here',
      index: 0,
      total: 1,
      state: state({ hintsUsed: 1 }),
    });

    const store = useScenariosStore();
    await store.fetchDetail(1);
    await store.requestHint(10);

    expect(store.current?.questions[0]?.hintsRevealed).toEqual(['look here']);
    expect(store.current?.state.hintsUsed).toBe(1);
  });
});
