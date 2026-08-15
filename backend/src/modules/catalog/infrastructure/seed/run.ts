import { createDb } from '../../../../platform/db/client.js';
import { loadEnv } from '../../../../platform/env.js';
import { scenariosDirectory } from '../../content/index.js';
import { importScenarios } from './import.js';

const env = loadEnv();
const { db, close } = createDb(env.DIRECT_DATABASE_URL ?? env.DATABASE_URL);

try {
  const slugs = await importScenarios(db, scenariosDirectory);
  console.warn(`Imported ${slugs.length} scenario(s): ${slugs.join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await close();
}
