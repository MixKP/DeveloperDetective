import type { SubmitProgressRequest, SubmitProgressResponse } from '@dd/shared';
import type { AnswerKey, ScenarioCatalog } from '../../catalog/index.js';
import { Investigation } from '../domain/Investigation.js';
import { NotFoundError } from './errors.js';
import type { InvestigationRepository } from './ports.js';
import { toInvestigationState } from './toState.js';

/**
 * Records the ethical decision and closes the case.
 *
 * The request carries no score, and this use case would have nowhere to put one if it did:
 * the score is a derived property of the aggregate. Completion is likewise not something the
 * client asserts — `run.complete()` refuses unless the quiz is finished and a decision has
 * been recorded.
 */
export class SubmitProgress {
  constructor(
    private readonly catalog: ScenarioCatalog,
    private readonly answerKey: AnswerKey,
    private readonly investigations: InvestigationRepository,
  ) {}

  async execute(
    learnerId: string,
    request: SubmitProgressRequest,
  ): Promise<SubmitProgressResponse> {
    const { scenarioId, completed, ethicalChoiceId } = request;

    const totalQuestions = await this.catalog.countQuestions(scenarioId);
    if (totalQuestions === 0) throw new NotFoundError('Scenario');

    const run =
      (await this.investigations.find(learnerId, scenarioId)) ??
      Investigation.start(learnerId, scenarioId);

    if (ethicalChoiceId !== undefined) {
      if (!(await this.catalog.hasEthicalChoice(scenarioId, ethicalChoiceId))) {
        throw new NotFoundError('Ethical choice');
      }
      // Throws if the quiz is unfinished or a decision was already made.
      run.submitEthicalChoice(ethicalChoiceId, totalQuestions);
    }

    if (completed) {
      run.complete(totalQuestions);
    }

    await this.investigations.save(run);

    // Revealed only once a decision exists — which is the whole point of the ethical beat.
    const outcome =
      run.ethicalChoiceId !== null
        ? await this.answerKey.ethicalOutcome(run.ethicalChoiceId)
        : null;

    return {
      state: toInvestigationState(run, totalQuestions),
      ethicalOutcome: outcome,
    };
  }
}
