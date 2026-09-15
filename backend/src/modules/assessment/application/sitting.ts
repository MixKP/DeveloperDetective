import type { Attempt } from '../domain/Attempt.js';
import { QuestionDraw, sittingSeed } from '../domain/QuestionDraw.js';
import type { KnowledgeTestContent } from '../domain/readModels.js';

export interface Sitting {
  attemptNumber: number;
  /** The question ids this sitting asks, in the order it asks them. */
  questionIds: number[];
  seed: number;
}

/**
 * The sitting a learner is currently owed, derived rather than stored.
 *
 * Both use cases call this: the GET to render the questions, the POST to check
 * that the answers coming back belong to the sitting it handed out. Deriving it
 * twice is cheaper than persisting a draw, and it means a learner cannot submit
 * against a set of questions the server never dealt them.
 */
export function sittingFor(
  learnerId: string,
  test: KnowledgeTestContent,
  history: readonly Attempt[],
): Sitting {
  const attemptNumber = history.length + 1;
  const seen = new Set(
    history.flatMap((attempt) => attempt.gradedAnswers.map((answer) => answer.questionId)),
  );
  const seed = sittingSeed(learnerId, test.id, attemptNumber);

  return {
    attemptNumber,
    seed,
    questionIds: QuestionDraw.select(test.questions, seen, test.questionsPerAttempt, seed),
  };
}
