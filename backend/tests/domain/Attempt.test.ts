import { describe, expect, it } from 'vitest';
import { Attempt } from '../../src/modules/assessment/domain/Attempt.js';
import { AttemptRuleViolation } from '../../src/modules/assessment/domain/errors.js';

const LEARNER = '3f9f1a3e-6a4e-4f2b-9c3d-1a2b3c4d5e6f';
const TEST_ID = 9;
const QUESTIONS = [901, 902, 903];

const answer = (questionId: number, correct: boolean) => ({
  questionId,
  selectedOption: correct ? 'b' : 'a',
  correct,
});

const submitAll = (correctness: boolean[]) =>
  Attempt.submit(
    LEARNER,
    TEST_ID,
    QUESTIONS.map((id, index) => answer(id, correctness[index] ?? false)),
    QUESTIONS,
  );

describe('Attempt', () => {
  it('counts the score from the graded answers', () => {
    expect(submitAll([true, false, true]).score.value).toBe(2);
    expect(submitAll([true, false, true]).score.total).toBe(3);
  });

  it('scores zero when every answer is wrong, rather than refusing the attempt', () => {
    expect(submitAll([false, false, false]).score.value).toBe(0);
  });

  it('refuses a partial submission instead of counting the gaps as wrong', () => {
    expect(() => Attempt.submit(LEARNER, TEST_ID, [answer(901, true)], QUESTIONS)).toThrowError(
      AttemptRuleViolation,
    );
  });

  it('refuses an answer to a question the test does not ask', () => {
    const rogue = [...QUESTIONS.map((id) => answer(id, true)), answer(999, true)];
    try {
      Attempt.submit(LEARNER, TEST_ID, rogue, QUESTIONS);
      expect.unreachable('a rogue question id should be refused');
    } catch (error) {
      expect((error as AttemptRuleViolation).code).toBe('UNKNOWN_QUESTION');
    }
  });

  it('treats a duplicated answer as a missing one', () => {
    const duplicated = [answer(901, true), answer(901, true), answer(902, true)];
    try {
      Attempt.submit(LEARNER, TEST_ID, duplicated, QUESTIONS);
      expect.unreachable('a duplicate answer leaves a question unanswered');
    } catch (error) {
      expect((error as AttemptRuleViolation).code).toBe('ATTEMPT_INCOMPLETE');
    }
  });

  it('names a retake as such, so the caller can say why it was refused', () => {
    try {
      Attempt.rejectRetake();
    } catch (error) {
      expect((error as AttemptRuleViolation).code).toBe('ATTEMPT_ALREADY_SUBMITTED');
    }
  });

  it('survives a round trip through its snapshot', () => {
    const original = submitAll([true, true, false]);
    const restored = Attempt.fromSnapshot(original.toSnapshot());
    expect(restored.score.value).toBe(original.score.value);
    expect(restored.submittedAt).toEqual(original.submittedAt);
  });
});
