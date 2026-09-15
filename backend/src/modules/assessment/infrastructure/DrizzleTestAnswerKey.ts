import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '../../../platform/db/client.js';
import type { SelectedOption, TestAnswerKey } from '../application/ports.js';
import type { GradedAnswerContent } from '../domain/readModels.js';
import { knowledgeQuestions } from './schema.js';

/**
 * The only file that reads `correct_option` or the per-option feedback for a
 * knowledge test, and it answers about options a learner has already chosen.
 */
export class DrizzleTestAnswerKey implements TestAnswerKey {
  constructor(private readonly db: Database) {}

  async grade(testId: number, selections: SelectedOption[]): Promise<GradedAnswerContent[]> {
    if (selections.length === 0) return [];

    // Only the questions actually answered: a sitting grades eight of a bank that
    // is deliberately several times larger, and every row carries its options,
    // feedback and explanation.
    const rows = await this.db
      .select()
      .from(knowledgeQuestions)
      .where(
        and(
          eq(knowledgeQuestions.testId, testId),
          inArray(
            knowledgeQuestions.id,
            selections.map((selection) => selection.questionId),
          ),
        ),
      );

    const byId = new Map(rows.map((row) => [row.id, row]));
    const graded: GradedAnswerContent[] = [];

    for (const selection of selections) {
      const question = byId.get(selection.questionId);
      if (!question) continue;

      const chosen = question.options.find((option) => option.id === selection.optionId);

      graded.push({
        questionId: question.id,
        prompt: question.prompt,
        selectedOption: selection.optionId,
        selectedText: chosen?.text ?? '',
        correctOption: question.correctOption,
        correct: question.correctOption === selection.optionId,
        principle: question.principle,
        clause: question.clause,
        feedback: chosen?.feedback ?? 'No option was selected for this question.',
        explanation: question.explanation,
      });
    }

    return graded;
  }
}
