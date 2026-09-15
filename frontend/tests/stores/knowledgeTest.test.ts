import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KnowledgeTestResponse, SubmitAttemptResponse } from '@dd/shared';

const getKnowledgeTest = vi.fn();
const submitAttempt = vi.fn();

class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

vi.mock('@/api/client', () => ({
  api: {
    getKnowledgeTest: (...args: unknown[]) => getKnowledgeTest(...args),
    submitAttempt: (...args: unknown[]) => submitAttempt(...args),
    getScenario: vi.fn(),
    answer: vi.fn(),
    hint: vi.fn(),
    listScenarios: vi.fn(),
    submitProgress: vi.fn(),
    getProgress: vi.fn(),
  },
  ApiError,
}));

const { useKnowledgeTestStore } = await import('@/stores/knowledgeTest');

const test = (over: Partial<KnowledgeTestResponse> = {}): KnowledgeTestResponse => ({
  slug: 'core-professional-ethics',
  variant: 'post',
  title: 'Core professional ethics',
  description: 'Ten questions, one sitting.',
  questions: [
    {
      id: 901,
      prompt: 'Disclose or ship?',
      orderIndex: 0,
      options: [
        { id: 'a', text: 'Ship' },
        { id: 'b', text: 'Disclose' },
      ],
    },
    {
      id: 902,
      prompt: 'Rotate and close?',
      orderIndex: 1,
      options: [
        { id: 'a', text: 'Assess the harm' },
        { id: 'b', text: 'Close the ticket' },
      ],
    },
  ],
  eligibility: { eligible: true, casesCompleted: 1, casesRequired: 1, casesTotal: 7 },
  attemptNumber: 1,
  attempt: null,
  history: [],
  ...over,
});

const locked = (): KnowledgeTestResponse =>
  test({
    questions: [],
    eligibility: { eligible: false, casesCompleted: 0, casesRequired: 1, casesTotal: 7 },
  });

const attempt = (): SubmitAttemptResponse['attempt'] => ({
  attemptNumber: 1,
  score: 1,
  total: 2,
  submittedAt: '2026-09-14T10:00:00.000Z',
  summary: {
    verdict: 'The wrong answers turn on one principle.',
    missed: [{ principle: 'product', questionIds: [902], guidance: 'Re-read Principle 3.' }],
    mastered: ['public'],
  },
  answers: [
    {
      questionId: 901,
      prompt: 'Disclose or ship?',
      selectedOption: 'b',
      selectedText: 'Disclose',
      correctOption: 'b',
      correct: true,
      principle: 'public',
      clause: '1.04',
      feedback: 'Correct. Principle 1 (Public), clause 1.04.',
      explanation: 'Disclosure comes first.',
    },
    {
      questionId: 902,
      prompt: 'Rotate and close?',
      selectedOption: 'b',
      selectedText: 'Close the ticket',
      correctOption: 'a',
      correct: false,
      principle: 'product',
      clause: '3.10',
      feedback: 'Breaches Principle 3 (Product), clause 3.10.',
      explanation: 'Rotation does not undo the harm.',
    },
  ],
});

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('the knowledge test store', () => {
  it('fetches once and reuses what it has', async () => {
    getKnowledgeTest.mockResolvedValue(test());
    const store = useKnowledgeTestStore();

    await store.fetch();
    await store.fetch();

    expect(getKnowledgeTest).toHaveBeenCalledTimes(1);
    expect(store.taken).toBe(false);
  });

  it('re-fetches while the test is locked, because closing a case is what opens it', async () => {
    getKnowledgeTest.mockResolvedValueOnce(locked()).mockResolvedValueOnce(test());
    const store = useKnowledgeTestStore();

    await store.fetch();
    expect(store.locked).toBe(true);
    expect(store.test?.questions).toHaveLength(0);

    await store.fetch();

    expect(getKnowledgeTest).toHaveBeenCalledTimes(2);
    expect(store.locked).toBe(false);
    expect(store.test?.questions).toHaveLength(2);
  });

  it('sends one response per question, in the order the test asks them', async () => {
    getKnowledgeTest.mockResolvedValue(test());
    submitAttempt.mockResolvedValue({ attempt: attempt() });
    const store = useKnowledgeTestStore();
    await store.fetch();

    await store.submit({ 901: 'b', 902: 'b' });

    expect(submitAttempt).toHaveBeenCalledWith('post', {
      responses: [
        { questionId: 901, optionId: 'b' },
        { questionId: 902, optionId: 'b' },
      ],
    });
    expect(store.taken).toBe(true);
    expect(store.attempt?.score).toBe(1);
    // The sitting just submitted joins the record, so the history reads complete
    // without another round trip.
    expect(store.test?.history).toEqual([
      { attemptNumber: 1, score: 1, total: 2, submittedAt: '2026-09-14T10:00:00.000Z' },
    ]);
  });

  it('refetches the authoritative attempt when a retake is refused', async () => {
    getKnowledgeTest
      .mockResolvedValueOnce(test())
      .mockResolvedValueOnce(test({ attempt: attempt() }));
    submitAttempt.mockRejectedValue(new ApiError('RULE_VIOLATION', 'Already submitted.'));
    const store = useKnowledgeTestStore();
    await store.fetch();

    await expect(store.submit({ 901: 'b', 902: 'b' })).rejects.toThrow();

    expect(getKnowledgeTest).toHaveBeenCalledTimes(2);
    expect(store.attempt?.total).toBe(2);
    expect(store.error).toBe('Already submitted.');
  });

  it('asks for the next sitting on a retake, rather than reusing the one it holds', async () => {
    getKnowledgeTest.mockResolvedValueOnce(test({ attempt: attempt() })).mockResolvedValueOnce(
      test({
        attemptNumber: 2,
        questions: [
          {
            id: 903,
            prompt: 'A different question entirely.',
            orderIndex: 0,
            options: [
              { id: 'a', text: 'One' },
              { id: 'b', text: 'Two' },
            ],
          },
        ],
        attempt: attempt(),
        history: [
          { attemptNumber: 1, score: 1, total: 2, submittedAt: '2026-09-14T10:00:00.000Z' },
        ],
      }),
    );
    const store = useKnowledgeTestStore();
    await store.fetch();

    await store.retake();

    expect(getKnowledgeTest).toHaveBeenCalledTimes(2);
    expect(store.test?.attemptNumber).toBe(2);
    expect(store.test?.questions[0]?.id).toBe(903);
    // The previous result stays available until the new sitting is submitted.
    expect(store.attempt?.attemptNumber).toBe(1);
  });

  it('drops the attempt when the learner changes', async () => {
    getKnowledgeTest.mockResolvedValue(test({ attempt: attempt() }));
    const store = useKnowledgeTestStore();
    await store.fetch();
    expect(store.taken).toBe(true);

    store.reset();

    expect(store.test).toBeNull();
    expect(store.taken).toBe(false);
  });
});
