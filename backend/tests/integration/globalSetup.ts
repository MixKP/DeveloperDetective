import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { importScenarios } from '../../src/modules/catalog/infrastructure/seed/import.js';

/**
 * Creates a dedicated `dd_test` database, migrates it, and seeds the real scenario content.
 *
 * A separate database rather than a transaction-per-test wrapper: these tests exercise the
 * repositories' own upsert and conflict handling, which means they need real committed
 * state. Dropping and recreating the database is also the only way to be certain a passing
 * run was not relying on rows left behind by the previous one.
 */
const ADMIN_URL = process.env.TEST_ADMIN_URL ?? 'postgresql://postgres:dev@localhost:5432/postgres';
const TEST_DB = 'dd_test';

export const testDatabaseUrl = ADMIN_URL.replace(/\/[^/]*$/, `/${TEST_DB}`);

export async function setup() {
  const admin = postgres(ADMIN_URL, { max: 1 });
  try {
    // Terminate stragglers first: DROP DATABASE fails while any session is connected, and
    // a crashed previous run leaves one behind.
    await admin.unsafe(
      `select pg_terminate_backend(pid) from pg_stat_activity where datname = '${TEST_DB}'`,
    );
    await admin.unsafe(`drop database if exists ${TEST_DB}`);
    await admin.unsafe(`create database ${TEST_DB}`);
  } catch (error) {
    throw new Error(
      `Could not prepare the ${TEST_DB} database. Is PostgreSQL running?\n` +
        `  docker run -d --name dd-pg -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16\n` +
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
  // Seeded with the real authored content, so the integration tests assert against the
  // scenarios that actually ship rather than against fixtures invented for the test.
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
