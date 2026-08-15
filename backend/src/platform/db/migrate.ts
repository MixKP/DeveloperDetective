import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { migrationsFolder } from './migrations.js';

const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Set DIRECT_DATABASE_URL (preferred) or DATABASE_URL before migrating.');
  process.exit(1);
}

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
