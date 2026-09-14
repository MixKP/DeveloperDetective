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
  answers: AttemptAnswer[];
  submittedAt: Date;
}

/**
 * One learner's single sitting of one knowledge test. A post-test measures what
 * someone knows at a moment, so it is submitted whole and never retaken — the
 * aggregate has no mutator, only a factory that grades and closes it at once.
 */
export class Attempt {
  readonly learnerId: string;
  readonly testId: number;
  readonly submittedAt: Date;

  private readonly answers: AttemptAnswer[];

  private constructor(snapshot: AttemptSnapshot) {
    this.learnerId = snapshot.learnerId;
    this.testId = snapshot.testId;
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

    return new Attempt({ learnerId, testId, answers, submittedAt: now });
  }

  static fromSnapshot(snapshot: AttemptSnapshot): Attempt {
    return new Attempt(snapshot);
  }

  static rejectRetake(): never {
    throw new AttemptRuleViolation(
      'ATTEMPT_ALREADY_SUBMITTED',
      'This test has already been submitted and cannot be retaken.',
    );
  }

  toSnapshot(): AttemptSnapshot {
    return {
      learnerId: this.learnerId,
      testId: this.testId,
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
