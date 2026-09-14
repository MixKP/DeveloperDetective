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
  attempt: null,
  ...over,
});

const attempt = (): SubmitAttemptResponse['attempt'] => ({
  score: 1,
  total: 2,
  submittedAt: '2026-09-14T10:00:00.000Z',
  answers: [
    {
      questionId: 901,
      selectedOption: 'b',
      correctOption: 'b',
      correct: true,
      principle: 'public',
      clause: '1.04',
      feedback: 'Correct. Principle 1 (Public), clause 1.04.',
      explanation: 'Disclosure comes first.',
    },
    {
      questionId: 902,
      selectedOption: 'b',
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
