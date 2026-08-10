import type { Express } from 'express';
import type { AnswerKey, ScenarioCatalog } from './modules/catalog/index.js';
import {
  createInvestigationModule,
  type InvestigationRepository,
} from './modules/investigation/index.js';
import { createHealthRouter } from './platform/health/health.controller.js';
import { createServer } from './platform/http/server.js';

/**
 * The composition root — the one place the object graph is assembled.
 *
 * This is dependency injection without a framework: roughly twenty lines, readable top to
 * bottom, with no decorators, no container and no runtime reflection to debug. A DI library
 * would add indirection that a project this size would never earn back.
 *
 * Note that it takes ports, not implementations. Tests build the app with in-memory fakes;
 * `main.ts` builds it with Drizzle-backed adapters. Neither path changes a single line of
 * application or domain code.
 */
export interface ApiDeps {
  catalog: ScenarioCatalog;
  answerKey: AnswerKey;
  investigations: InvestigationRepository;
  pingDb: () => Promise<boolean>;
  corsOrigins?: string[];
}

export function createApiApp(deps: ApiDeps): Express {
  const investigation = createInvestigationModule({
    catalog: deps.catalog,
    answerKey: deps.answerKey,
    investigations: deps.investigations,
  });

  return createServer({
    routers: [
      { path: '/api', router: createHealthRouter(deps.pingDb) },
      { path: '/api', router: investigation.router },
    ],
    corsOrigins: deps.corsOrigins,
  });
}
