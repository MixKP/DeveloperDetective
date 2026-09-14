/**
 * The same property the investigation score has: there is no constructor that
 * takes a number, so no code path exists that assigns a score. It is counted
 * from graded answers or it does not exist.
 */
export class TestScore {
  private constructor(
    readonly value: number,
    readonly total: number,
  ) {}

  static derive(answers: readonly { correct: boolean }[]): TestScore {
    return new TestScore(
      answers.reduce((count, answer) => count + (answer.correct ? 1 : 0), 0),
      answers.length,
    );
  }
}
