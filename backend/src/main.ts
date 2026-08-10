import { createApiApp } from './composition.js';
import { createCatalogModule } from './modules/catalog/index.js';
import { DrizzleInvestigationRepository } from './modules/investigation/infrastructure/DrizzleInvestigationRepository.js';
import { createDb } from './platform/db/client.js';
import { loadEnv } from './platform/env.js';

const env = loadEnv();
const { db, ping, close } = createDb(env.DATABASE_URL);

const { catalog, answerKey } = createCatalogModule(db);

const app = createApiApp({
  catalog,
  answerKey,
  investigations: new DrizzleInvestigationRepository(db),
  pingDb: ping,
  // Only in development. In the container nginx proxies /api, so the app is same-origin
  // and CORS never applies.
  corsOrigins: env.NODE_ENV === 'production' ? [] : env.corsOrigins,
});

const server = app.listen(env.API_PORT, () => {
  console.warn(`API listening on :${env.API_PORT}`);
});

/**
 * Containers are stopped with SIGTERM. Without this the process is killed mid-request and
 * the pool is never drained, which shows up as connection churn against Supabase.
 */
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void close().finally(() => process.exit(0));
    });

    // server.close() waits for every open connection to end, and nginx holds keep-alive
    // connections to this process. Without this the callback above would not fire inside
    // Docker's grace period, SIGKILL would land, and the pool drain this handler exists to
    // guarantee would never run.
    server.closeAllConnections();
  });
}
