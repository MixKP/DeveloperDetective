import { describe, expect, it } from 'vitest';
import { seedFrom, shuffle } from '../../src/modules/assessment/domain/shuffle.js';

const OPTIONS = ['a', 'b', 'c', 'd'];

describe('shuffle', () => {
  it('is the same order every time for the same seed', () => {
    expect(shuffle(OPTIONS, 42)).toEqual(shuffle(OPTIONS, 42));
  });

  it('keeps every item exactly once', () => {
    expect([...shuffle(OPTIONS, 7)].sort()).toEqual(OPTIONS);
  });

  it('does not simply return the input order', () => {
    const orders = new Set([1, 2, 3, 4, 5, 6].map((seed) => shuffle(OPTIONS, seed).join('')));

    expect(orders.size).toBeGreaterThan(1);
    expect([...orders].some((order) => order !== 'abcd')).toBe(true);
  });

  it('leaves the input untouched', () => {
    const original = [...OPTIONS];
    shuffle(OPTIONS, 3);

    expect(OPTIONS).toEqual(original);
  });

  it('seeds differently for different learners and sittings', () => {
    expect(seedFrom('learner-a', 9, 1)).not.toBe(seedFrom('learner-b', 9, 1));
    expect(seedFrom('learner-a', 9, 1)).not.toBe(seedFrom('learner-a', 9, 2));
    expect(seedFrom('learner-a', 9, 1)).toBe(seedFrom('learner-a', 9, 1));
  });
});
