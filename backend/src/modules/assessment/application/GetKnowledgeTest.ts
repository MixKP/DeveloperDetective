import type { AttemptResult, KnowledgeTestResponse, TestVariant } from '@dd/shared';
import type { Attempt } from '../domain/Attempt.js';
import { NotFoundError } from './errors.js';
import type { AttemptRepository, KnowledgeTestCatalog, TestAnswerKey } from './ports.js';

export class GetKnowledgeTest {
  constructor(
    private readonly catalog: KnowledgeTestCatalog,
    private readonly answerKey: TestAnswerKey,
    private readonly attempts: AttemptRepository,
  ) {}

  async execute(learnerId: string, variant: TestVariant): Promise<KnowledgeTestResponse> {
    const test = await this.catalog.findByVariant(variant);
    if (!test) throw new NotFoundError('Knowledge test');

    const attempt = await this.attempts.find(learnerId, test.id);

    return {
      slug: test.slug,
      variant: test.variant,
      title: test.title,
      description: test.description,
      questions: test.questions,
      attempt: attempt ? await this.resultFor(test.id, attempt) : null,
    };
  }

  /**
   * A finished attempt is re-graded from the stored selections rather than from a
   * copy of the feedback taken at submit time, so the key stays the single source
   * of truth and a corrected explanation reaches everyone who already sat the test.
   */
  private async resultFor(testId: number, attempt: Attempt): Promise<AttemptResult> {
    const answers = await this.answerKey.grade(
      testId,
      attempt.gradedAnswers.map((answer) => ({
        questionId: answer.questionId,
        optionId: answer.selectedOption,
      })),
    );

    return {
      score: attempt.score.value,
      total: attempt.score.total,
      submittedAt: attempt.submittedAt.toISOString(),
      answers,
    };
  }
}
