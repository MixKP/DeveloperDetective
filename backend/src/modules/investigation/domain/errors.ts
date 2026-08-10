/**
 * Domain errors. These describe a broken business rule, not an HTTP outcome — the domain
 * has no idea what a status code is. `platform/http/errors.ts` is the single place that
 * translates these into responses.
 */

export type RuleViolationCode =
  | 'QUESTION_ALREADY_SOLVED'
  | 'NO_MORE_HINTS'
  | 'HINTS_EXHAUSTED_FOR_SOLVED_QUESTION'
  | 'QUIZ_NOT_COMPLETE'
  | 'ETHICAL_CHOICE_ALREADY_MADE'
  | 'ETHICAL_CHOICE_REQUIRED';

export class RuleViolation extends Error {
  constructor(
    readonly code: RuleViolationCode,
    message: string,
  ) {
    super(message);
    this.name = 'RuleViolation';
  }
}
