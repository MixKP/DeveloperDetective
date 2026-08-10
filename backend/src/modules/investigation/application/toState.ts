import type { InvestigationState } from '@dd/shared';
import type { Investigation } from '../domain/Investigation.js';

export function toInvestigationState(
  run: Investigation,
  totalQuestions: number,
): InvestigationState {
  return {
    score: run.score.value,
    hintsUsed: run.hintsUsed,
    wrongAttempts: run.wrongAttempts,
    solvedQuestionIds: run.solvedQuestionIds,
    vulnerableLinesUnlocked: run.canRevealVulnerableLines(),
    quizComplete: run.isQuizComplete(totalQuestions),
    completed: run.completed,
    stage: run.stage(totalQuestions),
    ethicalChoiceId: run.ethicalChoiceId,
  };
}
