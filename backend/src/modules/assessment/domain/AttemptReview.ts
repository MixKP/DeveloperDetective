import type { AttemptSummaryContent, EthicsPrinciple } from './readModels.js';

export interface ReviewedAnswer {
  questionId: number;
  principle: EthicsPrinciple;
  correct: boolean;
}

/**
 * What a learner should do next, built from the sitting they just finished.
 *
 * Grouped by principle rather than listed by question: two wrong answers about
 * Principle 1 are one gap, not two, and the thing worth revising is the principle.
 * Guidance is authored per principle and passed in — the aggregate decides what
 * was missed, not what to say about it.
 */
export class AttemptReview {
  static of(
    answers: readonly ReviewedAnswer[],
    guidance: Readonly<Partial<Record<EthicsPrinciple, string>>>,
  ): AttemptSummaryContent {
    const missedIds = new Map<EthicsPrinciple, number[]>();
    const covered = new Set<EthicsPrinciple>();

    for (const answer of answers) {
      covered.add(answer.principle);
      if (answer.correct) continue;
      missedIds.set(answer.principle, [
        ...(missedIds.get(answer.principle) ?? []),
        answer.questionId,
      ]);
    }

    const missed = [...missedIds.entries()].map(([principle, questionIds]) => ({
      principle,
      questionIds,
      guidance:
        guidance[principle] ?? 'Re-read this principle in the Code before your next sitting.',
    }));

    return {
      verdict: AttemptReview.verdict(
        answers.length - missedIds.size,
        answers.length,
        missed.length,
      ),
      missed,
      mastered: [...covered].filter((principle) => !missedIds.has(principle)),
    };
  }

  private static verdict(_held: number, total: number, gaps: number): string {
    if (total === 0) return 'Nothing was answered, so there is nothing to report.';
    if (gaps === 0) {
      return 'Every question held. Nothing in this sitting points at a principle you need to revisit.';
    }
    const principles = gaps === 1 ? 'one principle' : `${gaps} principles`;
    return `The wrong answers turn on ${principles}. Work through the guidance below before you sit it again — the retake draws different questions.`;
  }
}
