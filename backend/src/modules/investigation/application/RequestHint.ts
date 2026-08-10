import type { HintResponse } from '@dd/shared';
import type { AnswerKey, ScenarioCatalog } from '../../catalog/index.js';
import { Investigation } from '../domain/Investigation.js';
import { NotFoundError } from './errors.js';
import type { InvestigationRepository } from './ports.js';
import { toInvestigationState } from './toState.js';

/**
 * Reveals the next hint and charges for it.
 *
 * Which hint comes next is server state, not a client parameter — a learner cannot skip
 * ahead to the most revealing hint while paying for only one.
 */
export class RequestHint {
  constructor(
    private readonly catalog: ScenarioCatalog,
    private readonly answerKey: AnswerKey,
    private readonly investigations: InvestigationRepository,
  ) {}

  async execute(learnerId: string, scenarioId: number, questionId: number): Promise<HintResponse> {
    const question = await this.catalog.findQuestion(questionId);
    if (!question || question.scenarioId !== scenarioId) throw new NotFoundError('Question');

    const run =
      (await this.investigations.find(learnerId, scenarioId)) ??
      Investigation.start(learnerId, scenarioId);

    // Throws when the learner has already seen every hint, or when the question is solved.
    const index = run.revealHint(questionId, question.hintsTotal);

    const hint = await this.answerKey.hintAt(questionId, index);
    if (hint === null) {
      // Content and metadata disagree. Deliberately bail out BEFORE saving, so a broken
      // scenario cannot charge the learner for a hint that does not exist.
      throw new NotFoundError('Hint');
    }

    await this.investigations.save(run);
    const totalQuestions = await this.catalog.countQuestions(scenarioId);

    return {
      hint,
      index,
      total: question.hintsTotal,
      state: toInvestigationState(run, totalQuestions),
    };
  }
}
