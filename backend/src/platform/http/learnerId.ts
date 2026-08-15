import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpError } from './errors.js';
import type { VerifyToken } from './token.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare module 'express-serve-static-core' {
  interface Request {
    learnerId: string;
    /** True when the id came from a verified Supabase token rather than a client-chosen UUID. */
    authenticated: boolean;
  }
}

const missingId = () =>
  new HttpError(
    400,
    'MISSING_LEARNER_ID',
    'Send an Authorization: Bearer token, or an X-Learner-Id UUID to continue anonymously.',
  );

/**
 * Resolves the learner id for a request, from either:
 *
 *   1. `Authorization: Bearer <supabase access token>` — verified, and the user's
 *      `sub` becomes the learner id. Signed-in learners keep their progress across devices.
 *   2. `X-Learner-Id: <uuid>` — the anonymous identifier from ADR 0006. Identity, not
 *      authentication: anyone presenting a UUID gets that UUID's progress.
 *
 * Both write the same `req.learnerId`, so no use case knows which one was used.
 * When no verifier is configured, only the anonymous path exists.
 */
export function createRequireLearner(verifyToken?: VerifyToken): RequestHandler {
  return function requireLearner(req: Request, _res: Response, next: NextFunction): void {
    const authorization = req.header('Authorization');

    if (authorization?.startsWith('Bearer ')) {
      if (!verifyToken) {
        next(
          new HttpError(401, 'INVALID_TOKEN', 'This deployment has no authentication configured.'),
        );
        return;
      }

      verifyToken(authorization.slice('Bearer '.length).trim()).then(
        (subject) => {
          req.learnerId = subject;
          req.authenticated = true;
          next();
        },
        () => {
          next(new HttpError(401, 'INVALID_TOKEN', 'Your session is not valid. Sign in again.'));
        },
      );
      return;
    }

    const header = req.header('X-Learner-Id');
    if (!header || !UUID_RE.test(header)) {
      next(missingId());
      return;
    }

    req.learnerId = header;
    req.authenticated = false;
    next();
  };
}

/** Anonymous-only middleware, for tests and for deployments without Supabase auth. */
export const requireLearnerId = createRequireLearner();
