import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './errors.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare module 'express-serve-static-core' {
  interface Request {
    learnerId: string;
  }
}

/**
 * Reads the learner's pseudonymous progress key.
 *
 * To be explicit, because the name invites the wrong assumption: this is NOT authentication
 * and must never be treated as such. It identifies a progress row, nothing more. Anyone
 * presenting a UUID gets that UUID's quiz scores — acceptable only because the data carries
 * no PII and there are no privileged operations behind it.
 *
 * The format check exists so a malformed header fails fast with a clear message instead of
 * quietly creating a junk progress row.
 */
export function requireLearnerId(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('X-Learner-Id');
  if (!header || !UUID_RE.test(header)) {
    next(
      new HttpError(
        400,
        'MISSING_LEARNER_ID',
        'X-Learner-Id must be present and a valid UUID. It identifies your progress, not you.',
      ),
    );
    return;
  }
  req.learnerId = header;
  next();
}
