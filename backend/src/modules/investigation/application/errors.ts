/**
 * Application-level failures. A missing scenario is not a broken business rule, so it is
 * not a `RuleViolation` — it is simply something that is not there.
 */
export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = 'NotFoundError';
  }
}
