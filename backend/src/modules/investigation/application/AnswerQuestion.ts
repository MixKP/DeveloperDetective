import type { AnswerResponse } from '@dd/shared';
import type { AnswerKey, ScenarioCatalog } from '../../catalog/index.js';
import { Investigation } from '../domain/Investigation.js';
import { NotFoundError } from './errors.js';
import type { InvestigationRepository } from './ports.js';
import { toInvestigationState } from './toState.js';

/**
 * Grades one answer.
 *
 * Note what this use case never sees: the correct option. It asks catalog for a verdict and
 * acts on the boolean. There is no branch here that could accidentally serialize an answer
 * key, because there is no answer key in scope.
 */
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
    // The scenario check stops a learner grading a question from a case they are not in.
    if (!question || question.scenarioId !== scenarioId) throw new NotFoundError('Question');

    const verdict = await this.answerKey.checkAnswer(questionId, optionId);
    if (!verdict) throw new NotFoundError('Question');

    const run =
      (await this.investigations.find(learnerId, scenarioId)) ??
      Investigation.start(learnerId, scenarioId);

    const unlockedBefore = run.canRevealVulnerableLines();

    // Throws RuleViolation if the question is already solved, which is what stops a learner
    // from re-answering to farm the explanation or to pad their attempt count.
    run.recordAnswer(questionId, verdict.kind, verdict.correct);
    await this.investigations.save(run);

    const totalQuestions = await this.catalog.countQuestions(scenarioId);

    return {
      correct: verdict.correct,
      // Gated a second time on this side of the boundary. Catalog already withholds the
      // explanation on a miss; belt and braces, because a leak here is unrecoverable.
      explanation: verdict.correct ? verdict.explanation : null,
      justUnlockedVulnerableLines: !unlockedBefore && run.canRevealVulnerableLines(),
      state: toInvestigationState(run, totalQuestions),
    };
  }
}
