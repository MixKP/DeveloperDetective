import { eq } from 'drizzle-orm';
import type { Database } from '../../../platform/db/client.js';
import type { AnswerKey } from '../application/ports.js';
import type { AnswerVerdict, DebriefContent, EthicalOutcomeContent } from '../domain/readModels.js';
import { ethicalChoices, files, questions, scenarios } from './schema.js';

/**
 * THE ONLY FILE IN THE CODEBASE THAT READS THE ANSWER KEY.
 *
 * `questions.correct_option`, `questions.explanation`, `questions.hints`,
 * `files.vulnerable_lines`, `ethical_choices.quality` and `ethical_choices.outcome` are
 * named here and nowhere else. Everything above this class receives verdicts and
 * individually authorized fragments, never the secrets in bulk.
 *
 * Two consequences worth being explicit about:
 *
 *  - `checkAnswer` compares in memory and returns a boolean. The correct option never
 *    leaves this method, so no caller can leak what it cannot hold.
 *  - `explanation` is returned only when the answer was right. The gating happens here as
 *    well as in the use case, because a leak of this particular field is unrecoverable —
 *    once a learner has seen the explanation, the question is spent.
 */
export class DrizzleAnswerKey implements AnswerKey {
  constructor(private readonly db: Database) {}

  async checkAnswer(questionId: number, optionId: string): Promise<AnswerVerdict | null> {
    const [row] = await this.db
      .select({
        correctOption: questions.correctOption,
        explanation: questions.explanation,
        kind: questions.kind,
      })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    if (!row) return null;

    const correct = row.correctOption === optionId;
    return { correct, explanation: correct ? row.explanation : null, kind: row.kind };
  }

  async hintAt(questionId: number, index: number): Promise<string | null> {
    const hints = await this.hintsFor(questionId);
    return hints[index] ?? null;
  }

  async revealedHints(questionId: number, count: number): Promise<string[]> {
    if (count <= 0) return [];
    const hints = await this.hintsFor(questionId);
    return hints.slice(0, count);
  }

  async explanationFor(questionId: number): Promise<string | null> {
    const [row] = await this.db
      .select({ explanation: questions.explanation })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);
    return row?.explanation ?? null;
  }

  async vulnerableLines(scenarioId: number): Promise<Record<string, number[]>> {
    const rows = await this.db
      .select({ path: files.path, vulnerableLines: files.vulnerableLines })
      .from(files)
      .where(eq(files.scenarioId, scenarioId));

    const byPath: Record<string, number[]> = {};
    for (const row of rows) {
      if (row.vulnerableLines.length > 0) byPath[row.path] = row.vulnerableLines;
    }
    return byPath;
  }

  async debrief(scenarioId: number): Promise<DebriefContent | null> {
    const [row] = await this.db
      .select({
        rootCause: scenarios.rootCause,
        businessImpact: scenarios.businessImpact,
        remediation: scenarios.remediation,
      })
      .from(scenarios)
      .where(eq(scenarios.id, scenarioId))
      .limit(1);
    return row ?? null;
  }

  async ethicalOutcome(choiceId: number): Promise<EthicalOutcomeContent | null> {
    const [row] = await this.db
      .select({
        choiceId: ethicalChoices.id,
        quality: ethicalChoices.quality,
        outcome: ethicalChoices.outcome,
      })
      .from(ethicalChoices)
      .where(eq(ethicalChoices.id, choiceId))
      .limit(1);
    return row ?? null;
  }

  private async hintsFor(questionId: number): Promise<string[]> {
    const [row] = await this.db
      .select({ hints: questions.hints })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);
    return row?.hints ?? [];
  }
}
