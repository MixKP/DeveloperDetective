import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type DbHandle } from '../../src/platform/db/client.js';
import { DrizzleAnswerKey } from '../../src/modules/catalog/infrastructure/DrizzleAnswerKey.js';
import { DrizzleScenarioCatalog } from '../../src/modules/catalog/infrastructure/DrizzleScenarioCatalog.js';
import { DrizzleInvestigationRepository } from '../../src/modules/investigation/infrastructure/DrizzleInvestigationRepository.js';
import { Investigation } from '../../src/modules/investigation/domain/Investigation.js';

let handle: DbHandle;
let catalog: DrizzleScenarioCatalog;
let answerKey: DrizzleAnswerKey;
let investigations: DrizzleInvestigationRepository;
let sqlInjectionId: number;

function collectKeys(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, found);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      found.push(key);
      collectKeys(child, found);
    }
  }
  return found;
}

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL not set — globalSetup should have set it.');

  handle = createDb(url);
  catalog = new DrizzleScenarioCatalog(handle.db);
  answerKey = new DrizzleAnswerKey(handle.db);
  investigations = new DrizzleInvestigationRepository(handle.db);

  const summaries = await catalog.listSummaries();
  sqlInjectionId = summaries.find((s) => s.slug === 'sql-injection-auth-bypass')!.id;
});

afterAll(async () => {
  await handle?.close();
});

describe('DrizzleScenarioCatalog', () => {
  it('lists the seeded scenarios with their question counts', async () => {
    const summaries = await catalog.listSummaries();
    expect(summaries).toHaveLength(2);
    for (const summary of summaries) {
      expect(summary.questionCount).toBe(3);
    }
  });

  it('NEVER returns answer-key fields, whatever the shape of the query', async () => {
    const content = await catalog.findById(sqlInjectionId);

    const keys = collectKeys(content);
    for (const forbidden of [
      'correctOption',
      'correct_option',
      'hints',
      'explanation',
      'rootCause',
      'businessImpact',
      'remediation',
      'vulnerableLines',
    ]) {
      expect(keys, `catalog leaked the key "${forbidden}"`).not.toContain(forbidden);
    }

    const serialized = JSON.stringify(content);
    for (const secret of [
      'Line 42.',
      'Parameterized queries keep data',
      'interpolating the email',
    ]) {
      expect(serialized, `catalog leaked the value "${secret}"`).not.toContain(secret);
    }
  });

  it('reports hint counts without the hint text', async () => {
    const content = await catalog.findById(sqlInjectionId);
    const locate = content!.questions.find((q) => q.kind === 'locate')!;
    expect(locate.hintsTotal).toBe(3);
    expect(JSON.stringify(locate)).not.toContain('Line 42');
  });

  it('rejects an ethical choice from another scenario', async () => {
    const other = (await catalog.listSummaries()).find((s) => s.id !== sqlInjectionId)!;
    const otherContent = await catalog.findById(other.id);
    const foreignChoiceId = otherContent!.ethicalChoices[0]!.id;

    expect(await catalog.hasEthicalChoice(sqlInjectionId, foreignChoiceId)).toBe(false);
  });

  it('returns null for an unknown scenario', async () => {
    expect(await catalog.findById(999_999)).toBeNull();
  });
});

describe('DrizzleAnswerKey', () => {
  it('grades correctly and withholds the explanation on a miss', async () => {
    const content = await catalog.findById(sqlInjectionId);
    const locate = content!.questions.find((q) => q.kind === 'locate')!;

    const wrong = await answerKey.checkAnswer(locate.id, 'a');
    expect(wrong?.correct).toBe(false);
    expect(wrong?.explanation).toBeNull();

    const right = await answerKey.checkAnswer(locate.id, 'b');
    expect(right?.correct).toBe(true);
    expect(right?.explanation).toContain('23');
  });

  it('serves hints one at a time and stops at the end', async () => {
    const content = await catalog.findById(sqlInjectionId);
    const locate = content!.questions.find((q) => q.kind === 'locate')!;

    expect(await answerKey.hintAt(locate.id, 0)).toContain('deploy touched');
    expect(await answerKey.revealedHints(locate.id, 2)).toHaveLength(2);
    expect(await answerKey.hintAt(locate.id, 99)).toBeNull();
  });

  it('maps vulnerable lines by file path', async () => {
    const lines = await answerKey.vulnerableLines(sqlInjectionId);
    expect(lines['src/services/auth.service.ts']).toEqual([23, 24]);
    expect(lines['src/db/pool.ts']).toBeUndefined();
  });

  it('returns the debrief and the ethical outcome', async () => {
    expect((await answerKey.debrief(sqlInjectionId))?.rootCause).toContain('interpolating');

    const content = await catalog.findById(sqlInjectionId);
    const outcome = await answerKey.ethicalOutcome(content!.ethicalChoices[0]!.id);
    expect(outcome?.quality).toBe('good');
  });
});

describe('DrizzleInvestigationRepository', () => {
  it('returns null before a run exists', async () => {
    expect(await investigations.find(randomUUID(), sqlInjectionId)).toBeNull();
  });

  it('round-trips the whole aggregate through jsonb', async () => {
    const learnerId = randomUUID();
    const content = await catalog.findById(sqlInjectionId);
    const [q1, q2, q3] = content!.questions;

    const run = Investigation.start(learnerId, sqlInjectionId);
    run.revealHint(q1!.id, 3);
    run.revealHint(q1!.id, 3);
    run.recordAnswer(q1!.id, 'locate', false);
    run.recordAnswer(q1!.id, 'locate', true);
    run.recordAnswer(q2!.id, 'explain', true);
    run.recordAnswer(q3!.id, 'solve', true);
    run.submitEthicalChoice(content!.ethicalChoices[0]!.id, 3);
    run.complete(3);
    await investigations.save(run);

    const loaded = await investigations.find(learnerId, sqlInjectionId);
    expect(loaded).not.toBeNull();
    expect(loaded!.toSnapshot()).toEqual(run.toSnapshot());

    expect(loaded!.hintsRevealedFor(q1!.id)).toBe(2);
    expect(loaded!.hintsUsed).toBe(2);
    expect(loaded!.canRevealVulnerableLines()).toBe(true);
    expect(loaded!.score.value).toBe(65);
  });

  it('upserts rather than inserting a second row for the same learner and scenario', async () => {
    const learnerId = randomUUID();
    const run = Investigation.start(learnerId, sqlInjectionId);

    await investigations.save(run);
    run.revealHint((await catalog.findById(sqlInjectionId))!.questions[0]!.id, 3);
    await investigations.save(run);
    await investigations.save(run);

    const all = await investigations.findAllForLearner(learnerId);
    expect(all).toHaveLength(1);
    expect(all[0]!.hintsUsed).toBe(1);
  });

  it('keeps learners isolated from each other', async () => {
    const a = randomUUID();
    const b = randomUUID();
    await investigations.save(Investigation.start(a, sqlInjectionId));

    expect(await investigations.findAllForLearner(b)).toHaveLength(0);
    expect(await investigations.find(b, sqlInjectionId)).toBeNull();
  });

  it('persists the derived score for dashboard aggregation', async () => {
    const learnerId = randomUUID();
    const content = await catalog.findById(sqlInjectionId);
    const run = Investigation.start(learnerId, sqlInjectionId);
    run.recordAnswer(content!.questions[0]!.id, 'locate', false);
    await investigations.save(run);

    const [row] = await handle.db.execute<{ score: number }>(
      sql`select score from progress where learner_id = ${learnerId}::uuid`,
    );
    expect(Number(row!.score)).toBe(85);
  });
});
