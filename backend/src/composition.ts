import type { Express } from 'express';
import type { AnswerKey, ScenarioCatalog } from './modules/catalog/index.js';
import {
  createInvestigationModule,
  type InvestigationRepository,
} from './modules/investigation/index.js';
import { createHealthRouter } from './platform/health/health.controller.js';
import { createServer } from './platform/http/server.js';

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
