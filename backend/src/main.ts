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
  corsOrigins: env.NODE_ENV === 'production' ? [] : env.corsOrigins,
});

const server = app.listen(env.API_PORT, () => {
  console.warn(`API listening on :${env.API_PORT}`);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void close().finally(() => process.exit(0));
    });

    server.closeAllConnections();
  });
}
