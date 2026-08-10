export const SCORING = {
  base: 100,
  hintPenalty: 10,
  wrongAttemptPenalty: 15,
  floor: 20,
} as const;

export class Score {
  private constructor(readonly value: number) {}

  static derive(hintsUsed: number, wrongAttempts: number): Score {
    const raw =
      SCORING.base - hintsUsed * SCORING.hintPenalty - wrongAttempts * SCORING.wrongAttemptPenalty;
    return new Score(Math.max(SCORING.floor, raw));
  }
}
