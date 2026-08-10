import type { AnswerResponse } from '@dd/shared';
import type { AnswerKey, ScenarioCatalog } from '../../catalog/index.js';
import { Investigation } from '../domain/Investigation.js';
import { NotFoundError } from './errors.js';
import type { InvestigationRepository } from './ports.js';
import { toInvestigationState } from './toState.js';

export class AnswerQuestion {
  constructor(
    private readonly catalog: ScenarioCatalog,
    private readonly answerKey: AnswerKey,
    private readonly investigations: InvestigationRepository,
  ) {}

  async execute(
    learnerId: string,
    scenarioId: number,
    questionId: number,
    optionId: string,
  ): Promise<AnswerResponse> {
    const question = await this.catalog.findQuestion(questionId);
    if (!question || question.scenarioId !== scenarioId) throw new NotFoundError('Question');

    const verdict = await this.answerKey.checkAnswer(questionId, optionId);
    if (!verdict) throw new NotFoundError('Question');

    const run =
      (await this.investigations.find(learnerId, scenarioId)) ??
      Investigation.start(learnerId, scenarioId);

    const unlockedBefore = run.canRevealVulnerableLines();

    run.recordAnswer(questionId, verdict.kind, verdict.correct);
    await this.investigations.save(run);

    const totalQuestions = await this.catalog.countQuestions(scenarioId);

    return {
      correct: verdict.correct,
      explanation: verdict.correct ? verdict.explanation : null,
      justUnlockedVulnerableLines: !unlockedBefore && run.canRevealVulnerableLines(),
      state: toInvestigationState(run, totalQuestions),
    };
  }
}
