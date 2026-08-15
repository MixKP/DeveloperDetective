import cors from 'cors';
import express, { type Express, type Router } from 'express';
import { errorHandler, notFoundHandler } from './errors.js';

export interface ServerOptions {
  routers: { path: string; router: Router }[];
  corsOrigins?: string[];
}

export function createServer({ routers, corsOrigins }: ServerOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  if (corsOrigins && corsOrigins.length > 0) {
    app.use(
      cors({
        origin: corsOrigins,
        allowedHeaders: ['Content-Type', 'X-Learner-Id', 'Authorization'],
      }),
    );
  }

  for (const { path, router } of routers) {
    app.use(path, router);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
