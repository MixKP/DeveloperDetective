import { AttemptRuleViolation } from './errors.js';
import { TestScore } from './TestScore.js';

export interface AttemptAnswer {
  questionId: number;
  selectedOption: string;
  correct: boolean;
}

export interface AttemptSnapshot {
  learnerId: string;
  testId: number;
  attemptNumber: number;
  answers: AttemptAnswer[];
  submittedAt: Date;
}

/**
 * One sitting of one knowledge test by one learner. A sitting measures what
 * someone knew at a moment, so it is submitted whole and never edited — the
 * aggregate has no mutator, only a factory that grades and closes it at once.
 *
 * Sittings are numbered rather than unique: a learner may sit the test again, and
 * the next sitting is a new attempt against a different draw (ADR 0010), not a
 * correction of this one.
 */
export class Attempt {
  readonly learnerId: string;
  readonly testId: number;
  readonly attemptNumber: number;
  readonly submittedAt: Date;

  private readonly answers: AttemptAnswer[];

  private constructor(snapshot: AttemptSnapshot) {
    this.learnerId = snapshot.learnerId;
    this.testId = snapshot.testId;
    this.attemptNumber = snapshot.attemptNumber;
    this.answers = [...snapshot.answers];
    this.submittedAt = snapshot.submittedAt;
  }

  /**
   * `questionIds` is the full set the test asks. Grading a partial submission would
   * quietly count the unanswered questions as wrong, which reads as a learning
   * result rather than as the missing data it is.
   */
  static submit(
    learnerId: string,
    testId: number,
    attemptNumber: number,
    answers: AttemptAnswer[],
    questionIds: readonly number[],
    now: Date = new Date(),
  ): Attempt {
    const asked = new Set(questionIds);
    const answered = new Set<number>();

    for (const answer of answers) {
      if (!asked.has(answer.questionId)) {
        throw new AttemptRuleViolation(
          'UNKNOWN_QUESTION',
          'That answer refers to a question this test does not ask.',
        );
      }
      answered.add(answer.questionId);
    }

    if (answered.size !== asked.size) {
      throw new AttemptRuleViolation(
        'ATTEMPT_INCOMPLETE',
        'Every question must be answered before the test can be submitted.',
      );
    }

    return new Attempt({ learnerId, testId, attemptNumber, answers, submittedAt: now });
  }

  static fromSnapshot(snapshot: AttemptSnapshot): Attempt {
    return new Attempt(snapshot);
  }

  /**
   * A sitting whose number is already recorded. Two tabs submitting the same draw
   * both derive the same number, and the unique constraint refuses the second —
   * this is how that refusal reaches the learner as a rule rather than a 500.
   */
  static rejectDuplicateSitting(): never {
    throw new AttemptRuleViolation(
      'ATTEMPT_ALREADY_SUBMITTED',
      'That sitting has already been recorded. Reload for a fresh set of questions.',
    );
  }

  toSnapshot(): AttemptSnapshot {
    return {
      learnerId: this.learnerId,
      testId: this.testId,
      attemptNumber: this.attemptNumber,
      answers: [...this.answers],
      submittedAt: this.submittedAt,
    };
  }

  get score(): TestScore {
    return TestScore.derive(this.answers);
  }

  get gradedAnswers(): readonly AttemptAnswer[] {
    return this.answers;
  }
}
