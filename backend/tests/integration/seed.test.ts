import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type DbHandle } from '../../src/platform/db/client.js';
import { scenariosDirectory } from '../../src/modules/catalog/content/index.js';
import { importScenarios } from '../../src/modules/catalog/infrastructure/seed/import.js';

let handle: DbHandle;

const counts = async () => {
  const [row] = await handle.db.execute<{
    scenarios: string;
    files: string;
    questions: string;
    choices: string;
  }>(
    sql`select
          (select count(*) from scenarios) as scenarios,
          (select count(*) from files) as files,
          (select count(*) from questions) as questions,
          (select count(*) from ethical_choices) as choices`,
  );
  return {
    scenarios: Number(row!.scenarios),
    files: Number(row!.files),
    questions: Number(row!.questions),
    choices: Number(row!.choices),
  };
};

const questionIds = async () => {
  const rows = await handle.db.execute<{ id: number }>(sql`select id from questions order by id`);
  return [...rows].map((r) => Number(r.id));
};

beforeAll(() => {
  handle = createDb(process.env.TEST_DATABASE_URL!);
});

afterAll(async () => {
  await handle?.close();
});

describe('scenario import', () => {
  it('seeded the two authored scenarios', async () => {
    expect(await counts()).toEqual({ scenarios: 2, files: 8, questions: 6, choices: 6 });
  });

  it('is idempotent: re-importing changes no counts', async () => {
    const before = await counts();
    await importScenarios(handle.db, scenariosDirectory);
    await importScenarios(handle.db, scenariosDirectory);
    expect(await counts()).toEqual(before);
  });

  it('keeps row ids stable across reseeds, so learner progress survives', async () => {
    const before = await questionIds();
    await importScenarios(handle.db, scenariosDirectory);
    expect(await questionIds()).toEqual(before);
  });

  it('stores vulnerable lines as real jsonb arrays', async () => {
    const rows = await handle.db.execute<{ path: string; vulnerable_lines: number[] }>(
      sql`select path, vulnerable_lines from files where jsonb_array_length(vulnerable_lines) > 0`,
    );
    const flagged = [...rows];
    expect(flagged.length).toBeGreaterThan(0);
    for (const row of flagged) {
      expect(Array.isArray(row.vulnerable_lines)).toBe(true);
    }
  });

  it('rejects a scenario directory containing invalid content', async () => {
    const empty = path.dirname(fileURLToPath(import.meta.url));
    await expect(importScenarios(handle.db, empty)).resolves.toEqual([]);
  });
});

describe('schema constraints', () => {
  it('enforces one progress row per learner and scenario', async () => {
    const learnerId = '11111111-1111-4111-8111-111111111111';
    await handle.db.execute(
      sql`insert into progress (learner_id, scenario_id) values (${learnerId}::uuid, 1)`,
    );
    await expect(
      handle.db.execute(
        sql`insert into progress (learner_id, scenario_id) values (${learnerId}::uuid, 1)`,
      ),
    ).rejects.toThrow();
  });

  it('has row level security enabled on every table', async () => {
    const rows = await handle.db.execute<{ tablename: string; rowsecurity: boolean }>(
      sql`select tablename, rowsecurity from pg_tables where schemaname = 'public'`,
    );
    for (const row of rows) {
      expect(row.rowsecurity, `${row.tablename} has RLS disabled`).toBe(true);
    }
  });
});
