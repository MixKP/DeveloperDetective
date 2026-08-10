import type { Express } from 'express';
import { createApiApp } from './composition.js';
import { createCatalogModule } from './modules/catalog/index.js';
import { DrizzleInvestigationRepository } from './modules/investigation/infrastructure/DrizzleInvestigationRepository.js';
import { createDb } from './platform/db/client.js';
import { loadEnv, type Env } from './platform/env.js';

export interface AppHandle {
  app: Express;
  env: Env;
  close: () => Promise<void>;
}

export function createAppFromEnv(options: { maxConnections?: number } = {}): AppHandle {
  const env = loadEnv();
  const { db, ping, close } = createDb(env.DATABASE_URL, options);
  const { catalog, answerKey } = createCatalogModule(db);

  const app = createApiApp({
    catalog,
    answerKey,
    investigations: new DrizzleInvestigationRepository(db),
    pingDb: ping,
    corsOrigins: env.corsOrigins,
  });

  return { app, env, close };
}
