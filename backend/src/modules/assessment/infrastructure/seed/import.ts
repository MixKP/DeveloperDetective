import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { and, eq, gte } from 'drizzle-orm';
import type { Database } from '../../../../platform/db/client.js';
import { knowledgeQuestions, knowledgeTests } from '../schema.js';
import { knowledgeTestContentSchema, type KnowledgeTestContentInput } from './contentSchema.js';

export async function importKnowledgeTests(db: Database, directory: string): Promise<string[]> {
  const entries = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort();
  const imported: string[] = [];

  for (const entry of entries) {
    const raw: unknown = JSON.parse(await readFile(path.join(directory, entry), 'utf8'));

    const parsed = knowledgeTestContentSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `    ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid knowledge test content in ${entry}:\n${issues}`);
    }

    await importOne(db, parsed.data);
    imported.push(parsed.data.slug);
  }

  return imported;
}

async function importOne(db: Database, content: KnowledgeTestContentInput): Promise<void> {
  const testValues = {
    slug: content.slug,
    variant: content.variant,
    title: content.title,
    description: content.description,
  };

  const [test] = await db
    .insert(knowledgeTests)
    .values(testValues)
    .onConflictDoUpdate({ target: knowledgeTests.slug, set: testValues })
    .returning({ id: knowledgeTests.id });

  if (!test) throw new Error(`Failed to upsert knowledge test ${content.slug}`);

  for (const [index, question] of content.questions.entries()) {
    const values = {
      testId: test.id,
      prompt: question.prompt,
      options: question.options,
      correctOption: question.correctOption,
      principle: question.principle,
      clause: question.clause,
      explanation: question.explanation,
      orderIndex: index,
    };

    await db
      .insert(knowledgeQuestions)
      .values(values)
      .onConflictDoUpdate({
        target: [knowledgeQuestions.testId, knowledgeQuestions.orderIndex],
        set: values,
      });
  }

  // Upserting by position keeps question ids stable, so responses already recorded
  // still point at the question that was asked. Shortening a test still has to drop
  // the tail, and the cascade takes the responses with it.
  await db
    .delete(knowledgeQuestions)
    .where(
      and(
        eq(knowledgeQuestions.testId, test.id),
        gte(knowledgeQuestions.orderIndex, content.questions.length),
      ),
    );
}
