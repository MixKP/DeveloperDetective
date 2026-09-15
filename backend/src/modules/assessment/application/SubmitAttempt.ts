import type { SubmitAttemptRequest, SubmitAttemptResponse, TestVariant } from '@dd/shared';
import { Attempt } from '../domain/Attempt.js';
import { Eligibility } from '../domain/Eligibility.js';
import { NotFoundError } from './errors.js';
import type {
  AttemptRepository,
  CaseProgress,
  KnowledgeTestCatalog,
  TestAnswerKey,
} from './ports.js';
import { resultOf } from './resultOf.js';
import { sittingFor } from './sitting.js';

export class SubmitAttempt {
  constructor(
    private readonly catalog: KnowledgeTestCatalog,
    private readonly answerKey: TestAnswerKey,
    private readonly attempts: AttemptRepository,
    private readonly cases: CaseProgress,
  ) {}

  async execute(
    learnerId: string,
    variant: TestVariant,
    payload: SubmitAttemptRequest,
  ): Promise<SubmitAttemptResponse> {
    const test = await this.catalog.findByVariant(variant);
    if (!test) throw new NotFoundError('Knowledge test');

    // The gate is re-checked here rather than trusted from the GET: a locked test is
    // served without questions, but a client that knows the question ids could still
    // post an attempt the learner has not earned.
    const [completed, total] = await Promise.all([
      this.cases.countCompleted(learnerId),
      this.cases.countCases(),
    ]);
    Eligibility.assess(completed, total).requireOpen();

    const history = await this.attempts.history(learnerId, test.id);
    const sitting = sittingFor(learnerId, test, history);

    const graded = await this.answerKey.grade(test.id, payload.responses);
    const byQuestion = new Map(graded.map((answer) => [answer.questionId, answer]));

    // Built from what the learner sent and checked against the sitting they were
    // dealt, so an answer naming a question this draw did not ask is refused rather
    // than graded — a retake cannot be steered back onto questions already seen.
    const attempt = Attempt.submit(
      learnerId,
      test.id,
      sitting.attemptNumber,
      payload.responses.map((response) => ({
        questionId: response.questionId,
        selectedOption: response.optionId,
        correct: byQuestion.get(response.questionId)?.correct ?? false,
      })),
      sitting.questionIds,
    );

    await this.attempts.save(attempt);

    return { attempt: await resultOf(this.answerKey, test, attempt) };
  }
}
