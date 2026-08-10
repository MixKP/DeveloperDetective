import { HttpError } from '../../../platform/http/errors.js';
import { NotFoundError } from '../application/errors.js';
import { RuleViolation } from '../domain/errors.js';

export function toHttpError(error: unknown): unknown {
  if (error instanceof RuleViolation) {
    return new HttpError(422, 'RULE_VIOLATION', error.message);
  }
  if (error instanceof NotFoundError) {
    return new HttpError(404, 'NOT_FOUND', error.message);
  }
  return error;
}
