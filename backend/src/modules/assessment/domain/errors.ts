export type AttemptRuleViolationCode =
  'ATTEMPT_ALREADY_SUBMITTED' | 'ATTEMPT_INCOMPLETE' | 'CASES_INCOMPLETE' | 'UNKNOWN_QUESTION';

export class AttemptRuleViolation extends Error {
  constructor(
    readonly code: AttemptRuleViolationCode,
    message: string,
  ) {
    super(message);
    this.name = 'AttemptRuleViolation';
  }
}
