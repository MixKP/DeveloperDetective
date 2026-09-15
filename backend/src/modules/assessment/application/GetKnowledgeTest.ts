import type {
  AttemptRecord,
  KnowledgeTestResponse,
  TestEligibility,
  TestQuestionView,
  TestVariant,
} from '@dd/shared';
import type { Attempt } from '../domain/Attempt.js';
import { Eligibility } from '../domain/Eligibility.js';
import type { KnowledgeTestContent } from '../domain/readModels.js';
import { shuffle } from '../domain/shuffle.js';
import { NotFoundError } from './errors.js';
import type {
  AttemptRepository,
  CaseProgress,
  KnowledgeTestCatalog,
  TestAnswerKey,
} from './ports.js';
import { resultOf } from './resultOf.js';
import { sittingFor } from './sitting.js';

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

    const [history, eligibility] = await Promise.all([
      this.attempts.history(learnerId, test.id),
      this.eligibilityOf(learnerId),
    ]);

    const sitting = sittingFor(learnerId, test, history);
    const latest = history.at(-1) ?? null;

    // A locked test does not ship its questions at all. Hiding them in the client
    // would leave them one devtools tab away, and the gate exists so that nobody
    // sits the post-test before the platform has had anything to teach them.
    return {
      slug: test.slug,
      variant: test.variant,
      title: test.title,
      description: test.description,
      questions: eligibility.eligible ? views(test, sitting.questionIds, sitting.seed) : [],
      eligibility: toView(eligibility),
      attemptNumber: sitting.attemptNumber,
      attempt: latest ? await resultOf(this.answerKey, test, latest) : null,
      history: history.map(record),
    };
  }

  private async eligibilityOf(learnerId: string): Promise<Eligibility> {
    const [completed, total] = await Promise.all([
      this.cases.countCompleted(learnerId),
      this.cases.countCases(),
    ]);
    return Eligibility.assess(completed, total);
  }
}

/**
 * The questions of one sitting, in the drawn order, each with its own options
 * shuffled. Mapped field by field rather than spread: `principle` names half the
 * answer, and it must not travel with a question the learner has yet to answer.
 */
function views(
  test: KnowledgeTestContent,
  questionIds: readonly number[],
  seed: number,
): TestQuestionView[] {
  const byId = new Map(test.questions.map((question) => [question.id, question]));

  return questionIds.flatMap((id, index) => {
    const question = byId.get(id);
    if (!question) return [];
    return [
      {
        id: question.id,
        prompt: question.prompt,
        orderIndex: index,
        options: shuffle(question.options, seed + question.id).map((option) => ({
          id: option.id,
          text: option.text,
        })),
      },
    ];
  });
}

function record(attempt: Attempt): AttemptRecord {
  return {
    attemptNumber: attempt.attemptNumber,
    score: attempt.score.value,
    total: attempt.score.total,
    submittedAt: attempt.submittedAt.toISOString(),
  };
}

function toView(eligibility: Eligibility): TestEligibility {
  return {
    eligible: eligibility.eligible,
    casesCompleted: eligibility.casesCompleted,
    casesRequired: eligibility.casesRequired,
    casesTotal: eligibility.casesTotal,
  };
}
