import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { importScenarios } from '../../src/modules/catalog/infrastructure/seed/import.js';

const ADMIN_URL =
  process.env.TEST_ADMIN_URL ?? 'postgresql://postgres:postgres@localhost:54322/postgres';
const TEST_DB = 'dd_test';

export const testDatabaseUrl = ADMIN_URL.replace(/\/[^/]*$/, `/${TEST_DB}`);

export async function setup() {
  const admin = postgres(ADMIN_URL, { max: 1 });
  try {
    await admin.unsafe(
      `select pg_terminate_backend(pid) from pg_stat_activity where datname = '${TEST_DB}'`,
    );
    await admin.unsafe(`drop database if exists ${TEST_DB}`);
    await admin.unsafe(`create database ${TEST_DB}`);
  } catch (error) {
    throw new Error(
      `Could not prepare the ${TEST_DB} database. Is the local Supabase stack running?\n` +
        `  npx supabase start\n` +
        String(error),
    );
  } finally {
    await admin.end();
  }

  process.env.TEST_DATABASE_URL = testDatabaseUrl;

  const client = postgres(testDatabaseUrl, { max: 1 });
  const db = drizzle(client);
  const here = path.dirname(fileURLToPath(import.meta.url));

  await migrate(db, { migrationsFolder: path.join(here, '../../src/db/migrations') });
  await importScenarios(
    db,
    path.join(here, '../../src/modules/catalog/infrastructure/seed/scenarios'),
  );

  await client.end();
}

export async function teardown() {
  const admin = postgres(ADMIN_URL, { max: 1 });
  try {
    await admin.unsafe(
      `select pg_terminate_backend(pid) from pg_stat_activity where datname = '${TEST_DB}'`,
    );
    await admin.unsafe(`drop database if exists ${TEST_DB}`);
  } finally {
    await admin.end();
  }
}
