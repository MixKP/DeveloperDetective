import type { InvestigationState } from '@dd/shared';
import type { Investigation } from '../domain/Investigation.js';

/**
 * Aggregate → wire state.
 *
 * The use cases return @dd/shared DTOs directly rather than defining a parallel set of
 * application view models. A purist Clean Architecture would insert that extra layer, but
 * here it would be a 1:1 copy of every field — ceremony with no decoupling to show for it.
 * The trade-off accepted: a change to the wire format touches the application layer.
 */
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
