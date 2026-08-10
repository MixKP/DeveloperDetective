import { describe, expect, it } from 'vitest';
import { SCORING, Score } from '../../src/modules/investigation/domain/Score.js';

describe('Score', () => {
  it('starts at 100 for a clean run', () => {
    expect(Score.derive(0, 0).value).toBe(100);
  });

  it('charges 10 per hint', () => {
    expect(Score.derive(1, 0).value).toBe(90);
    expect(Score.derive(3, 0).value).toBe(70);
  });

  it('charges 15 per wrong attempt', () => {
    expect(Score.derive(0, 1).value).toBe(85);
    expect(Score.derive(0, 2).value).toBe(70);
  });

  it('combines both penalties', () => {
    // The walkthrough case: one hint taken, one question missed once.
    expect(Score.derive(1, 1).value).toBe(75);
    expect(Score.derive(2, 3).value).toBe(35);
  });

  it('never drops below the floor, however badly the run goes', () => {
    expect(Score.derive(20, 20).value).toBe(SCORING.floor);
    expect(Score.derive(1000, 1000).value).toBe(20);
  });

  it('lands exactly on the floor rather than overshooting it', () => {
    // 100 - 8*10 = 20, exactly the floor and not a point less.
    expect(Score.derive(8, 0).value).toBe(20);
    expect(Score.derive(9, 0).value).toBe(20);
  });
});
