import { Router } from 'express';
import { asyncHandler } from '../http/asyncHandler.js';

/**
 * No use case, no port, no entity — deliberately.
 *
 * Health is a liveness probe for the container, not a business capability. Wrapping a
 * connection ping in three layers of Clean Architecture would be ceremony with nothing to
 * protect. This is the documented exception, not an oversight.
 */
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
