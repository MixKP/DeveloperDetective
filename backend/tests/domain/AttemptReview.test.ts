import { describe, expect, it } from 'vitest';
import { AttemptReview } from '../../src/modules/assessment/domain/AttemptReview.js';

const GUIDANCE = {
  public: 'Re-read Principle 1.',
  product: 'Re-read Principle 3.',
} as const;

describe('AttemptReview', () => {
  it('groups two wrong answers about one principle into one gap', () => {
    const summary = AttemptReview.of(
      [
        { questionId: 1, principle: 'public', correct: false },
        { questionId: 2, principle: 'public', correct: false },
        { questionId: 3, principle: 'product', correct: true },
      ],
      GUIDANCE,
    );

    expect(summary.missed).toHaveLength(1);
    expect(summary.missed[0]!.questionIds).toEqual([1, 2]);
    expect(summary.missed[0]!.guidance).toBe('Re-read Principle 1.');
    expect(summary.verdict).toMatch(/one principle/);
  });

  it('reports the principles that held, so revision has a shape', () => {
    const summary = AttemptReview.of(
      [
        { questionId: 1, principle: 'public', correct: true },
        { questionId: 2, principle: 'product', correct: false },
      ],
      GUIDANCE,
    );

    expect(summary.mastered).toEqual(['public']);
    expect(summary.missed.map((m) => m.principle)).toEqual(['product']);
  });

  it('says there is nothing to revise when every answer held', () => {
    const summary = AttemptReview.of(
      [
        { questionId: 1, principle: 'public', correct: true },
        { questionId: 2, principle: 'product', correct: true },
      ],
      GUIDANCE,
    );

    expect(summary.missed).toEqual([]);
    expect(summary.mastered).toEqual(['public', 'product']);
    expect(summary.verdict).toMatch(/every question held/i);
  });

  it('still answers a missed principle that has no guidance authored', () => {
    const summary = AttemptReview.of([{ questionId: 1, principle: 'self', correct: false }], {});

    expect(summary.missed[0]!.guidance).toMatch(/Re-read this principle/);
  });
});
