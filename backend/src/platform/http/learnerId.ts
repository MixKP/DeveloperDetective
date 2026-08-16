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
    'Send an X-Learner-Id UUID. This deployment has no accounts configured.',
  );

const signInRequired = () => new HttpError(401, 'INVALID_TOKEN', 'Sign in to continue.');

/**
 * Resolves the learner id for a request.
 *
 * With a verifier configured, the only accepted credential is
 * `Authorization: Bearer <supabase access token>`; the verified `sub` becomes the
 * learner id. `X-Learner-Id` is refused, because a gate the client can skip by
 * dropping a header is not a gate (ADR 0008).
 *
 * With no verifier — a build that was given no Supabase credentials, meaning local
 * development and CI — the anonymous `X-Learner-Id` UUID of ADR 0006 is accepted
 * instead, so the app still runs without a project behind it.
 *
 * Either way it writes the same `req.learnerId`, so no use case knows the difference.
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

    if (verifyToken) {
      next(signInRequired());
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
