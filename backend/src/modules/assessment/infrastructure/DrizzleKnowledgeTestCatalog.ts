import { asc, eq } from 'drizzle-orm';
import type { Database } from '../../../platform/db/client.js';
import type { KnowledgeTestCatalog } from '../application/ports.js';
import type { KnowledgeTestContent, TestVariant } from '../domain/readModels.js';
import { knowledgeQuestions, knowledgeTests } from './schema.js';

export class DrizzleKnowledgeTestCatalog implements KnowledgeTestCatalog {
  constructor(private readonly db: Database) {}

  async findByVariant(variant: TestVariant): Promise<KnowledgeTestContent | null> {
    const [test] = await this.db
      .select()
      .from(knowledgeTests)
      .where(eq(knowledgeTests.variant, variant))
      .limit(1);

    if (!test) return null;

    const rows = await this.db
      .select({
        id: knowledgeQuestions.id,
        prompt: knowledgeQuestions.prompt,
        options: knowledgeQuestions.options,
        orderIndex: knowledgeQuestions.orderIndex,
      })
      .from(knowledgeQuestions)
      .where(eq(knowledgeQuestions.testId, test.id))
      .orderBy(asc(knowledgeQuestions.orderIndex));

    return {
      id: test.id,
      slug: test.slug,
      variant: test.variant,
      title: test.title,
      description: test.description,
      // The feedback on each option names the principle behind the right answer,
      // so it is dropped here rather than filtered downstream — this projection is
      // the only shape of a question that ever leaves the catalog.
      questions: rows.map((row) => ({
        id: row.id,
        prompt: row.prompt,
        orderIndex: row.orderIndex,
        options: row.options.map((option) => ({ id: option.id, text: option.text })),
      })),
    };
  }
}
