import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { and, eq, gte, notInArray } from 'drizzle-orm';
import type { Database } from '../../../../platform/db/client.js';
import { ethicalChoices, files, questions, scenarios } from '../schema.js';
import { scenarioContentSchema, type ScenarioContentInput } from './contentSchema.js';

export async function importScenarios(db: Database, directory: string): Promise<string[]> {
  const entries = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort();
  const imported: string[] = [];

  for (const entry of entries) {
    const raw: unknown = JSON.parse(await readFile(path.join(directory, entry), 'utf8'));

    const parsed = scenarioContentSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `    ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid scenario content in ${entry}:\n${issues}`);
    }

    await importOne(db, parsed.data);
    imported.push(parsed.data.slug);
  }

  return imported;
}

async function importOne(db: Database, content: ScenarioContentInput): Promise<void> {
  const scenarioValues = {
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    severity: content.severity,
    tags: content.tags,
    estimatedMinutes: content.estimatedMinutes,
    language: content.language,
    briefSender: content.brief.sender,
    briefSenderRole: content.brief.senderRole,
    briefSubject: content.brief.subject,
    briefReceivedAt: content.brief.receivedAt,
    briefBody: content.brief.body,
    briefObjectives: content.brief.objectives,
    rootCause: content.debrief.rootCause,
    businessImpact: content.debrief.businessImpact,
    remediation: content.debrief.remediation,
  };

  const [scenario] = await db
    .insert(scenarios)
    .values(scenarioValues)
    .onConflictDoUpdate({ target: scenarios.slug, set: scenarioValues })
    .returning({ id: scenarios.id });

  if (!scenario) throw new Error(`Failed to upsert scenario ${content.slug}`);
  const scenarioId = scenario.id;

  for (const [index, file] of content.files.entries()) {
    const values = {
      scenarioId,
      path: file.path,
      code: file.code,
      language: file.language,
      vulnerableLines: file.vulnerableLines,
      changedLines: file.changedLines,
      recentlyChanged: file.recentlyChanged,
      orderIndex: index,
    };
    await db
      .insert(files)
      .values(values)
      .onConflictDoUpdate({ target: [files.scenarioId, files.path], set: values });
  }

  for (const [index, question] of content.questions.entries()) {
    const values = {
      scenarioId,
      kind: question.kind,
      prompt: question.prompt,
      options: question.options,
      correctOption: question.correctOption,
      explanation: question.explanation,
      hints: question.hints,
      orderIndex: index,
    };
    await db
      .insert(questions)
      .values(values)
      .onConflictDoUpdate({ target: [questions.scenarioId, questions.orderIndex], set: values });
  }

  for (const [index, choice] of content.ethicalChoices.entries()) {
    const values = {
      scenarioId,
      text: choice.text,
      quality: choice.quality,
      outcome: choice.outcome,
      orderIndex: index,
    };
    await db
      .insert(ethicalChoices)
      .values(values)
      .onConflictDoUpdate({
        target: [ethicalChoices.scenarioId, ethicalChoices.orderIndex],
        set: values,
      });
  }

  await pruneExtras(db, scenarioId, content);
}

async function pruneExtras(
  db: Database,
  scenarioId: number,
  content: ScenarioContentInput,
): Promise<void> {
  await db.delete(files).where(
    and(
      eq(files.scenarioId, scenarioId),
      notInArray(
        files.path,
        content.files.map((file) => file.path),
      ),
    ),
  );

  await db
    .delete(questions)
    .where(
      and(
        eq(questions.scenarioId, scenarioId),
        gte(questions.orderIndex, content.questions.length),
      ),
    );

  await db
    .delete(ethicalChoices)
    .where(
      and(
        eq(ethicalChoices.scenarioId, scenarioId),
        gte(ethicalChoices.orderIndex, content.ethicalChoices.length),
      ),
    );
}
