import { HttpError } from '../../../platform/http/errors.js';
import { NotFoundError } from '../application/errors.js';
import { RuleViolation } from '../domain/errors.js';

/**
 * Domain/application errors → transport.
 *
 * This mapping lives in the interface layer because it is the only layer allowed to know
 * about both sides. The domain throws `RuleViolation` without any idea that HTTP exists,
 * and platform's error handler only understands `HttpError`. This function is the seam.
 *
 * 422 rather than 400 for a rule violation: the request was well-formed and understood,
 * the business rules just said no.
 */
export function toHttpError(error: unknown): unknown {
  if (error instanceof RuleViolation) {
    return new HttpError(422, 'RULE_VIOLATION', error.message);
  }
  if (error instanceof NotFoundError) {
    return new HttpError(404, 'NOT_FOUND', error.message);
  }
  return error;
}
