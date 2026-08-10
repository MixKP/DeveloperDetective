import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Migrations run as an explicit deploy step (`npm run db:migrate`), never on container
 * boot. A crash-looping API that re-runs DDL on every restart is a good way to deadlock a
 * database at exactly the moment you least want to be debugging one.
 *
 * Uses the DIRECT connection: the transaction pooler cannot run DDL reliably.
 */
const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Set DIRECT_DATABASE_URL (preferred) or DATABASE_URL before migrating.');
  process.exit(1);
}

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/migrations',
);

// max: 1 — migrations must run in a single sequential session.
const client = postgres(connectionString, { max: 1 });

try {
  await migrate(drizzle(client), { migrationsFolder });
  console.warn('Migrations applied.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
