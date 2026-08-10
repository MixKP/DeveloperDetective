import type { HintResponse } from '@dd/shared';
import type { AnswerKey, ScenarioCatalog } from '../../catalog/index.js';
import { Investigation } from '../domain/Investigation.js';
import { NotFoundError } from './errors.js';
import type { InvestigationRepository } from './ports.js';
import { toInvestigationState } from './toState.js';

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

    const index = run.revealHint(questionId, question.hintsTotal);

    const hint = await this.answerKey.hintAt(questionId, index);
    if (hint === null) {
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
