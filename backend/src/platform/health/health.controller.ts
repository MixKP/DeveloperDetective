import { Router } from 'express';
import { asyncHandler } from '../http/asyncHandler.js';

export function createHealthRouter(pingDb: () => Promise<boolean>): Router {
  const router = Router();

  router.get(
    '/health',
    asyncHandler(async (_req, res) => {
      const dbReachable = await pingDb().catch(() => false);
      res.status(dbReachable ? 200 : 503).json({
        status: dbReachable ? 'ok' : 'degraded',
        db: dbReachable ? 'ok' : 'unreachable',
      });
    }),
  );

  return router;
}
