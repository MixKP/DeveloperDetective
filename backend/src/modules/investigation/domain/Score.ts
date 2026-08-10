/**
 * The scoring rule, and the only place it exists in the codebase.
 *
 * The frontend does not recompute this. It renders the number the API returns, which is
 * why there is no scoring module in @dd/shared: one rule, one home.
 */
export const SCORING = {
  base: 100,
  hintPenalty: 10,
  wrongAttemptPenalty: 15,
  floor: 20,
} as const;

/**
 * A derived score.
 *
 * There is deliberately no public constructor and no setter. The only way to obtain a Score
 * is to derive one from counters the server owns, which is what makes client-side tampering
 * structurally impossible rather than merely validated against.
 */
export class Score {
  private constructor(readonly value: number) {}

  static derive(hintsUsed: number, wrongAttempts: number): Score {
    const raw =
      SCORING.base - hintsUsed * SCORING.hintPenalty - wrongAttempts * SCORING.wrongAttemptPenalty;
    return new Score(Math.max(SCORING.floor, raw));
  }
}
