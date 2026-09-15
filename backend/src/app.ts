import type { Express } from 'express';
import { createApiApp } from './composition.js';
import { createAssessmentAdapters } from './modules/assessment/index.js';
import { createCatalogModule } from './modules/catalog/index.js';
import { DrizzleInvestigationRepository } from './modules/investigation/infrastructure/DrizzleInvestigationRepository.js';
import { ContentCache } from './platform/cache/ContentCache.js';
import { createDb } from './platform/db/client.js';
import { loadEnv, type Env } from './platform/env.js';
import { createTokenVerifier } from './platform/http/token.js';

export interface AppHandle {
  app: Express;
  env: Env;
  close: () => Promise<void>;
}

export function createAppFromEnv(options: { maxConnections?: number } = {}): AppHandle {
  const env = loadEnv();
  const { db, ping, close } = createDb(env.DATABASE_URL, options);
  // One cache for all authored content: it is seeded together and it expires
  // together. Learner state is read straight from the database.
  const content = new ContentCache({ ttlMs: env.CONTENT_CACHE_TTL_MS });
  const { catalog, answerKey } = createCatalogModule(db, content);
  const { tests, testAnswerKey, attempts } = createAssessmentAdapters(db, content);

  const app = createApiApp({
    catalog,
    answerKey,
    investigations: new DrizzleInvestigationRepository(db),
    tests,
    testAnswerKey,
    attempts,
    pingDb: ping,
    corsOrigins: env.corsOrigins,
    verifyToken: createTokenVerifier({
      jwtSecret: env.SUPABASE_JWT_SECRET,
      supabaseUrl: env.SUPABASE_URL,
    }),
  });

  return { app, env, close };
}
