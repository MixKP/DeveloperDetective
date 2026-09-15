import type { AttemptResult } from '@dd/shared';
import type { Attempt } from '../domain/Attempt.js';
import { AttemptReview } from '../domain/AttemptReview.js';
import type { KnowledgeTestContent } from '../domain/readModels.js';
import type { TestAnswerKey } from './ports.js';

/**
 * One sitting's result, re-graded from the stored selections rather than from a
 * copy of the feedback taken at submit time, so the key stays the single source of
 * truth and a corrected explanation reaches everyone who already sat the test.
 */
export async function resultOf(
  answerKey: TestAnswerKey,
  test: KnowledgeTestContent,
  attempt: Attempt,
): Promise<AttemptResult> {
  const answers = await answerKey.grade(
    test.id,
    attempt.gradedAnswers.map((answer) => ({
      questionId: answer.questionId,
      optionId: answer.selectedOption,
    })),
  );

  return {
    attemptNumber: attempt.attemptNumber,
    score: attempt.score.value,
    total: attempt.score.total,
    submittedAt: attempt.submittedAt.toISOString(),
    answers,
    summary: AttemptReview.of(answers, test.guidance),
  };
}
