import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../../../../platform/db/client.js';
import { loadEnv } from '../../../../platform/env.js';
import { importScenarios } from './import.js';

/** CLI entry point: `npm run db:seed`. Safe to re-run — the import upserts by natural key. */
const env = loadEnv();
const { db, close } = createDb(env.DIRECT_DATABASE_URL ?? env.DATABASE_URL);

const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'scenarios');

try {
  const slugs = await importScenarios(db, directory);
  console.warn(`Imported ${slugs.length} scenario(s): ${slugs.join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await close();
}
