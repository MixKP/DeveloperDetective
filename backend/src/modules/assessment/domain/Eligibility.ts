import { AttemptRuleViolation } from './errors.js';

/**
 * How many cases must be closed before the post-test opens.
 *
 * The course intent is every case — the test asks what the whole platform taught, and a
 * learner who has closed one has only met one vulnerability class. The catalog is longer
 * than a single sitting, so the gate is lowered to the first closed case rather than
 * dropped altogether: raise this number and the rule tightens, with nothing else to change.
 */
export const CASES_REQUIRED = 1;

/**
 * Whether a learner has been through enough of the platform to be measured by it. A
 * value object rather than a boolean so the reason travels with the verdict — a locked
 * test has to tell the learner how far off they are, not merely that it is locked.
 */
export class Eligibility {
  private constructor(
    readonly casesCompleted: number,
    readonly casesRequired: number,
    readonly casesTotal: number,
  ) {}

  static assess(casesCompleted: number, casesTotal: number): Eligibility {
    return new Eligibility(casesCompleted, CASES_REQUIRED, casesTotal);
  }

  get eligible(): boolean {
    return this.casesCompleted >= this.casesRequired;
  }

  /** How many more cases the learner owes the gate. Never negative. */
  get casesRemaining(): number {
    return Math.max(this.casesRequired - this.casesCompleted, 0);
  }

  requireOpen(): void {
    if (this.eligible) return;
    const cases = this.casesRemaining === 1 ? 'case' : 'cases';
    throw new AttemptRuleViolation(
      'CASES_INCOMPLETE',
      `Close ${this.casesRemaining} more ${cases} before sitting this test.`,
    );
  }
}
