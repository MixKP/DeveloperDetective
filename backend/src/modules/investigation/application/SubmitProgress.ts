import type { SubmitProgressRequest, SubmitProgressResponse } from '@dd/shared';
import type { AnswerKey, ScenarioCatalog } from '../../catalog/index.js';
import { Investigation } from '../domain/Investigation.js';
import { NotFoundError } from './errors.js';
import type { InvestigationRepository } from './ports.js';
import { toInvestigationState } from './toState.js';

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
      run.submitEthicalChoice(ethicalChoiceId, totalQuestions);
    }

    if (completed) {
      run.complete(totalQuestions);
    }

    await this.investigations.save(run);

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
