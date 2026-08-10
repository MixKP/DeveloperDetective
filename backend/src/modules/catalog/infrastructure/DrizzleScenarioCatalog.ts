import { asc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../../platform/db/client.js';
import type { ScenarioCatalog } from '../application/ports.js';
import type {
  QuestionContent,
  ScenarioContent,
  ScenarioSummaryContent,
} from '../domain/readModels.js';
import { ethicalChoices, files, questions, scenarios } from './schema.js';

/**
 * Public scenario content.
 *
 * Every query here selects columns EXPLICITLY. `select()` with no argument would pull
 * `correct_option`, `explanation` and `hints` along with everything else, and from there a
 * single careless spread into a response is all it takes to publish the answer key. The
 * secrets are reachable only through DrizzleAnswerKey, which is the sibling of this class
 * and the only file allowed to name those columns.
 */
export class DrizzleScenarioCatalog implements ScenarioCatalog {
  constructor(private readonly db: Database) {}

  async listSummaries(): Promise<ScenarioSummaryContent[]> {
    const counts = this.db
      .select({
        scenarioId: questions.scenarioId,
        total: sql<number>`count(*)::int`.as('total'),
      })
      .from(questions)
      .groupBy(questions.scenarioId)
      .as('counts');

    const rows = await this.db
      .select({
        id: scenarios.id,
        slug: scenarios.slug,
        title: scenarios.title,
        summary: scenarios.summary,
        severity: scenarios.severity,
        tags: scenarios.tags,
        estimatedMinutes: scenarios.estimatedMinutes,
        language: scenarios.language,
        questionCount: sql<number>`coalesce(${counts.total}, 0)::int`,
      })
      .from(scenarios)
      .leftJoin(counts, eq(counts.scenarioId, scenarios.id))
      .orderBy(asc(scenarios.id));

    return rows;
  }

  async findById(scenarioId: number): Promise<ScenarioContent | null> {
    // Explicit columns, and note which ones are absent: root_cause, business_impact and
    // remediation. Those are the debrief — gated content that GetScenarioDetail fetches
    // through AnswerKey.debrief() only once the quiz is complete. A bare select() here
    // would quietly load them into the same object the public payload is built from.
    const [scenario] = await this.db
      .select({
        id: scenarios.id,
        slug: scenarios.slug,
        title: scenarios.title,
        summary: scenarios.summary,
        severity: scenarios.severity,
        tags: scenarios.tags,
        estimatedMinutes: scenarios.estimatedMinutes,
        language: scenarios.language,
        briefSender: scenarios.briefSender,
        briefSenderRole: scenarios.briefSenderRole,
        briefSubject: scenarios.briefSubject,
        briefReceivedAt: scenarios.briefReceivedAt,
        briefBody: scenarios.briefBody,
        briefObjectives: scenarios.briefObjectives,
      })
      .from(scenarios)
      .where(eq(scenarios.id, scenarioId))
      .limit(1);
    if (!scenario) return null;

    const [fileRows, questionRows, choiceRows] = await Promise.all([
      this.db
        .select({
          id: files.id,
          path: files.path,
          code: files.code,
          language: files.language,
          recentlyChanged: files.recentlyChanged,
        })
        .from(files)
        .where(eq(files.scenarioId, scenarioId))
        .orderBy(asc(files.orderIndex), asc(files.path)),

      this.selectQuestions(scenarioId),

      this.db
        .select({
          id: ethicalChoices.id,
          scenarioId: ethicalChoices.scenarioId,
          text: ethicalChoices.text,
        })
        .from(ethicalChoices)
        .where(eq(ethicalChoices.scenarioId, scenarioId))
        .orderBy(asc(ethicalChoices.orderIndex)),
    ]);

    return {
      id: scenario.id,
      slug: scenario.slug,
      title: scenario.title,
      summary: scenario.summary,
      severity: scenario.severity,
      tags: scenario.tags,
      estimatedMinutes: scenario.estimatedMinutes,
      language: scenario.language,
      questionCount: questionRows.length,
      brief: {
        sender: scenario.briefSender,
        senderRole: scenario.briefSenderRole,
        subject: scenario.briefSubject,
        receivedAt: scenario.briefReceivedAt,
        body: scenario.briefBody,
        objectives: scenario.briefObjectives,
      },
      files: fileRows,
      questions: questionRows,
      ethicalChoices: choiceRows,
    };
  }

  async findQuestion(questionId: number): Promise<QuestionContent | null> {
    const [row] = await this.db
      .select({
        id: questions.id,
        scenarioId: questions.scenarioId,
        kind: questions.kind,
        prompt: questions.prompt,
        options: questions.options,
        orderIndex: questions.orderIndex,
        // The count, never the text. Hint text comes one purchase at a time from AnswerKey.
        hintsTotal: sql<number>`jsonb_array_length(${questions.hints})::int`,
      })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    return row ?? null;
  }

  async countQuestions(scenarioId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(questions)
      .where(eq(questions.scenarioId, scenarioId));
    return row?.total ?? 0;
  }

  async hasEthicalChoice(scenarioId: number, choiceId: number): Promise<boolean> {
    const [row] = await this.db
      .select({ id: ethicalChoices.id })
      .from(ethicalChoices)
      .where(
        sql`${ethicalChoices.id} = ${choiceId} and ${ethicalChoices.scenarioId} = ${scenarioId}`,
      )
      .limit(1);
    return row !== undefined;
  }

  private selectQuestions(scenarioId: number) {
    return this.db
      .select({
        id: questions.id,
        scenarioId: questions.scenarioId,
        kind: questions.kind,
        prompt: questions.prompt,
        options: questions.options,
        orderIndex: questions.orderIndex,
        hintsTotal: sql<number>`jsonb_array_length(${questions.hints})::int`,
      })
      .from(questions)
      .where(eq(questions.scenarioId, scenarioId))
      .orderBy(asc(questions.orderIndex));
  }
}
