import type { SubmitAttemptRequest, SubmitAttemptResponse, TestVariant } from '@dd/shared';
import { Attempt } from '../domain/Attempt.js';
import { NotFoundError } from './errors.js';
import type { AttemptRepository, KnowledgeTestCatalog, TestAnswerKey } from './ports.js';

export class SubmitAttempt {
  constructor(
    private readonly catalog: KnowledgeTestCatalog,
    private readonly answerKey: TestAnswerKey,
    private readonly attempts: AttemptRepository,
  ) {}

  async execute(
    learnerId: string,
    variant: TestVariant,
    payload: SubmitAttemptRequest,
  ): Promise<SubmitAttemptResponse> {
    const test = await this.catalog.findByVariant(variant);
    if (!test) throw new NotFoundError('Knowledge test');

    if (await this.attempts.find(learnerId, test.id)) Attempt.rejectRetake();

    const graded = await this.answerKey.grade(test.id, payload.responses);
    const byQuestion = new Map(graded.map((answer) => [answer.questionId, answer]));

    // Built from what the learner sent rather than from what graded, so a response
    // naming a question this test does not ask reaches the aggregate and is refused
    // there — grading it away silently would report it as an unanswered question.
    const attempt = Attempt.submit(
      learnerId,
      test.id,
      payload.responses.map((response) => ({
        questionId: response.questionId,
        selectedOption: response.optionId,
        correct: byQuestion.get(response.questionId)?.correct ?? false,
      })),
      test.questions.map((question) => question.id),
    );

    await this.attempts.save(attempt);

    const order = test.questions.map((question) => question.id);

    return {
      attempt: {
        score: attempt.score.value,
        total: attempt.score.total,
        submittedAt: attempt.submittedAt.toISOString(),
        answers: graded
          .slice()
          .sort((a, b) => order.indexOf(a.questionId) - order.indexOf(b.questionId)),
      },
    };
  }
}
