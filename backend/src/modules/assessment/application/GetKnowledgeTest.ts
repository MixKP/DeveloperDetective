import type {
  AttemptResult,
  KnowledgeTestResponse,
  TestEligibility,
  TestVariant,
} from '@dd/shared';
import type { Attempt } from '../domain/Attempt.js';
import { Eligibility } from '../domain/Eligibility.js';
import { NotFoundError } from './errors.js';
import type {
  AttemptRepository,
  CaseProgress,
  KnowledgeTestCatalog,
  TestAnswerKey,
} from './ports.js';

export class GetKnowledgeTest {
  constructor(
    private readonly catalog: KnowledgeTestCatalog,
    private readonly answerKey: TestAnswerKey,
    private readonly attempts: AttemptRepository,
    private readonly cases: CaseProgress,
  ) {}

  async execute(learnerId: string, variant: TestVariant): Promise<KnowledgeTestResponse> {
    const test = await this.catalog.findByVariant(variant);
    if (!test) throw new NotFoundError('Knowledge test');

    const [attempt, eligibility] = await Promise.all([
      this.attempts.find(learnerId, test.id),
      this.eligibilityOf(learnerId),
    ]);

    // A locked test does not ship its questions at all. Hiding them in the client would
    // leave them one devtools tab away, and the gate exists so that nobody sits the
    // post-test before the platform has had anything to teach them.
    const released = eligibility.eligible || attempt !== null;

    return {
      slug: test.slug,
      variant: test.variant,
      title: test.title,
      description: test.description,
      questions: released ? test.questions : [],
      eligibility: toView(eligibility),
      attempt: attempt ? await this.resultFor(test.id, attempt) : null,
    };
  }

  private async eligibilityOf(learnerId: string): Promise<Eligibility> {
    const [completed, total] = await Promise.all([
      this.cases.countCompleted(learnerId),
      this.cases.countCases(),
    ]);
    return Eligibility.assess(completed, total);
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

function toView(eligibility: Eligibility): TestEligibility {
  return {
    eligible: eligibility.eligible,
    casesCompleted: eligibility.casesCompleted,
    casesRequired: eligibility.casesRequired,
    casesTotal: eligibility.casesTotal,
  };
}
