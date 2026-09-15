import { describe, expect, it } from 'vitest';
import { CASES_REQUIRED, Eligibility } from '../../src/modules/assessment/domain/Eligibility.js';
import { AttemptRuleViolation } from '../../src/modules/assessment/domain/errors.js';

describe('Eligibility', () => {
  it('opens the test once the required number of cases is closed', () => {
    expect(Eligibility.assess(CASES_REQUIRED, 7).eligible).toBe(true);
    expect(Eligibility.assess(CASES_REQUIRED - 1, 7).eligible).toBe(false);
  });

  it('stays open for a learner who has closed more than the gate asks for', () => {
    const eligibility = Eligibility.assess(7, 7);

    expect(eligibility.eligible).toBe(true);
    expect(eligibility.casesRemaining).toBe(0);
  });

  it('says how many cases are still owed, so the lock can explain itself', () => {
    expect(Eligibility.assess(0, 7).casesRemaining).toBe(CASES_REQUIRED);
  });

  it('refuses a sitting it is not open for, and names the shortfall', () => {
    expect(() => Eligibility.assess(0, 7).requireOpen()).toThrowError(AttemptRuleViolation);
    try {
      Eligibility.assess(0, 7).requireOpen();
    } catch (error) {
      expect((error as AttemptRuleViolation).code).toBe('CASES_INCOMPLETE');
      expect((error as AttemptRuleViolation).message).toMatch(/close 1 more case/i);
    }
  });

  it('lets a sitting through without complaint once it is open', () => {
    expect(() => Eligibility.assess(1, 7).requireOpen()).not.toThrow();
  });
});
