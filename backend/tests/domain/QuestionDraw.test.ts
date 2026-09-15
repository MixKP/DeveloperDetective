import { describe, expect, it } from 'vitest';
import { QuestionDraw, sittingSeed } from '../../src/modules/assessment/domain/QuestionDraw.js';
import type { DrawCandidate } from '../../src/modules/assessment/domain/QuestionDraw.js';
import type { EthicsPrinciple } from '../../src/modules/assessment/domain/readModels.js';

const PRINCIPLES: EthicsPrinciple[] = [
  'public',
  'client-and-employer',
  'product',
  'judgement',
  'management',
  'profession',
  'colleagues',
  'self',
];

/** Three questions per principle, the shape the authored bank has. */
const POOL: DrawCandidate[] = PRINCIPLES.flatMap((principle, p) =>
  [0, 1, 2].map((v) => ({ id: p * 10 + v, principle, orderIndex: p * 10 + v })),
);

const LEARNER = '3f9f1a3e-6a4e-4f2b-9c3d-1a2b3c4d5e6f';
const principleOf = (id: number) => POOL.find((c) => c.id === id)!.principle;

describe('QuestionDraw', () => {
  it('covers every principle exactly once when the sitting is the size of the Code', () => {
    const drawn = QuestionDraw.select(POOL, new Set(), 8, sittingSeed(LEARNER, 9, 1));

    expect(drawn).toHaveLength(8);
    expect(new Set(drawn.map(principleOf)).size).toBe(8);
  });

  it('is stable for the same sitting, so a reload asks the same questions', () => {
    const seed = sittingSeed(LEARNER, 9, 2);

    expect(QuestionDraw.select(POOL, new Set(), 8, seed)).toEqual(
      QuestionDraw.select(POOL, new Set(), 8, seed),
    );
  });

  it('asks nothing twice until the bank runs out', () => {
    let seen = new Set<number>();

    for (let sitting = 1; sitting <= 3; sitting += 1) {
      const drawn = QuestionDraw.select(POOL, seen, 8, sittingSeed(LEARNER, 9, sitting));

      expect(drawn.filter((id) => seen.has(id))).toEqual([]);
      expect(new Set(drawn.map(principleOf)).size).toBe(8);
      seen = new Set([...seen, ...drawn]);
    }

    expect(seen.size).toBe(POOL.length);
  });

  it('keeps dealing a full sitting once every question has been seen', () => {
    const everything = new Set(POOL.map((c) => c.id));

    const drawn = QuestionDraw.select(POOL, everything, 8, sittingSeed(LEARNER, 9, 4));

    expect(drawn).toHaveLength(8);
    expect(new Set(drawn.map(principleOf)).size).toBe(8);
  });

  it('deals different learners different sittings', () => {
    const mine = QuestionDraw.select(POOL, new Set(), 8, sittingSeed(LEARNER, 9, 1));
    const theirs = QuestionDraw.select(
      POOL,
      new Set(),
      8,
      sittingSeed('9f1c2d3e-4b5a-6c7d-8e9f-0a1b2c3d4e5f', 9, 1),
    );

    expect(mine).not.toEqual(theirs);
  });

  it('spreads a short sitting across principles rather than doubling up', () => {
    const drawn = QuestionDraw.select(POOL, new Set(), 3, sittingSeed(LEARNER, 9, 1));

    expect(drawn).toHaveLength(3);
    expect(new Set(drawn.map(principleOf)).size).toBe(3);
  });

  it('asks a longer sitting than the Code has principles without repeating a question', () => {
    const drawn = QuestionDraw.select(POOL, new Set(), 12, sittingSeed(LEARNER, 9, 1));

    expect(drawn).toHaveLength(12);
    expect(new Set(drawn).size).toBe(12);
  });

  it('never asks for more than the bank holds', () => {
    const small = POOL.slice(0, 2);

    expect(QuestionDraw.select(small, new Set(), 8, 1)).toHaveLength(2);
  });
});
