import { describe, expect, it } from 'vitest';
import { Investigation } from '../../src/modules/investigation/domain/Investigation.js';
import { RuleViolation } from '../../src/modules/investigation/domain/errors.js';

const LEARNER = '3f9f1a3e-6a4e-4f2b-9c3d-1a2b3c4d5e6f';
const SCENARIO = 1;
const TOTAL_QUESTIONS = 3;

const newRun = () => Investigation.start(LEARNER, SCENARIO);

/** Solve every question so the run reaches the debrief gate. */
function solveWholeQuiz(run: Investigation) {
  run.recordAnswer(101, 'locate', true);
  run.recordAnswer(102, 'explain', true);
  run.recordAnswer(103, 'solve', true);
}

describe('Investigation — a fresh run', () => {
  it('starts unscored, unsolved, and locked', () => {
    const run = newRun();
    expect(run.score.value).toBe(100);
    expect(run.hintsUsed).toBe(0);
    expect(run.wrongAttempts).toBe(0);
    expect(run.solvedQuestionIds).toEqual([]);
    expect(run.canRevealVulnerableLines()).toBe(false);
    expect(run.completed).toBe(false);
  });
});

describe('Investigation — progressive reveal', () => {
  it('keeps vulnerable lines hidden until a locate question is solved', () => {
    const run = newRun();

    run.recordAnswer(102, 'explain', true);
    expect(run.canRevealVulnerableLines()).toBe(false);

    run.recordAnswer(103, 'solve', true);
    expect(run.canRevealVulnerableLines()).toBe(false);

    run.recordAnswer(101, 'locate', true);
    expect(run.canRevealVulnerableLines()).toBe(true);
  });

  it('does not unlock on a wrong locate answer', () => {
    const run = newRun();
    run.recordAnswer(101, 'locate', false);
    expect(run.canRevealVulnerableLines()).toBe(false);
    expect(run.wrongAttempts).toBe(1);
  });

  it('stays unlocked once unlocked', () => {
    const run = newRun();
    run.recordAnswer(101, 'locate', true);
    run.recordAnswer(102, 'explain', false);
    expect(run.canRevealVulnerableLines()).toBe(true);
  });
});

describe('Investigation — answering', () => {
  it('counts wrong attempts and leaves the question unsolved', () => {
    const run = newRun();
    run.recordAnswer(101, 'locate', false);
    run.recordAnswer(101, 'locate', false);
    expect(run.wrongAttempts).toBe(2);
    expect(run.hasSolved(101)).toBe(false);
    expect(run.score.value).toBe(70);
  });

  it('refuses to re-answer a solved question, so the score cannot be farmed', () => {
    const run = newRun();
    run.recordAnswer(101, 'locate', true);
    expect(() => run.recordAnswer(101, 'locate', true)).toThrowError(RuleViolation);
  });

  it('does not let a repeat wrong answer on a solved question add penalties', () => {
    const run = newRun();
    run.recordAnswer(101, 'locate', true);
    expect(() => run.recordAnswer(101, 'locate', false)).toThrowError(RuleViolation);
    expect(run.wrongAttempts).toBe(0);
  });
});

describe('Investigation — hints', () => {
  it('reveals hints in order and charges for each', () => {
    const run = newRun();
    expect(run.revealHint(101, 3)).toBe(0);
    expect(run.revealHint(101, 3)).toBe(1);
    expect(run.hintsUsed).toBe(2);
    expect(run.score.value).toBe(80);
  });

  it('tracks hint counts per question independently', () => {
    const run = newRun();
    run.revealHint(101, 3);
    run.revealHint(102, 3);
    run.revealHint(102, 3);
    expect(run.hintsRevealedFor(101)).toBe(1);
    expect(run.hintsRevealedFor(102)).toBe(2);
    expect(run.hintsUsed).toBe(3);
  });

  it('refuses to reveal past the last hint, and does not charge for the refusal', () => {
    const run = newRun();
    run.revealHint(101, 2);
    run.revealHint(101, 2);
    expect(() => run.revealHint(101, 2)).toThrowError(RuleViolation);
    expect(run.hintsUsed).toBe(2);
  });

  it('refuses to sell hints for an already-solved question', () => {
    const run = newRun();
    run.recordAnswer(101, 'locate', true);
    expect(() => run.revealHint(101, 3)).toThrowError(RuleViolation);
    expect(run.hintsUsed).toBe(0);
  });

  it('handles a question that has no hints at all', () => {
    const run = newRun();
    expect(() => run.revealHint(101, 0)).toThrowError(RuleViolation);
  });
});

describe('Investigation — quiz completion gate', () => {
  it('is incomplete until every question is solved', () => {
    const run = newRun();
    run.recordAnswer(101, 'locate', true);
    run.recordAnswer(102, 'explain', true);
    expect(run.isQuizComplete(TOTAL_QUESTIONS)).toBe(false);

    run.recordAnswer(103, 'solve', true);
    expect(run.isQuizComplete(TOTAL_QUESTIONS)).toBe(true);
  });

  it('is never complete for a scenario with no questions', () => {
    expect(newRun().isQuizComplete(0)).toBe(false);
  });
});

describe('Investigation — ethical decision', () => {
  it('cannot be made before the investigation is finished', () => {
    const run = newRun();
    run.recordAnswer(101, 'locate', true);
    expect(() => run.submitEthicalChoice(7, TOTAL_QUESTIONS)).toThrowError(RuleViolation);
    expect(run.ethicalChoiceId).toBeNull();
  });

  it('is recorded once the quiz is complete', () => {
    const run = newRun();
    solveWholeQuiz(run);
    run.submitEthicalChoice(7, TOTAL_QUESTIONS);
    expect(run.ethicalChoiceId).toBe(7);
  });

  it('cannot be retaken — you live with the call you made', () => {
    const run = newRun();
    solveWholeQuiz(run);
    run.submitEthicalChoice(7, TOTAL_QUESTIONS);
    expect(() => run.submitEthicalChoice(8, TOTAL_QUESTIONS)).toThrowError(RuleViolation);
    expect(run.ethicalChoiceId).toBe(7);
  });
});

describe('Investigation — completion', () => {
  it('refuses to close a case with unsolved questions', () => {
    const run = newRun();
    run.recordAnswer(101, 'locate', true);
    expect(() => run.complete(TOTAL_QUESTIONS)).toThrowError(RuleViolation);
  });

  it('refuses to close a case with no ethical decision', () => {
    const run = newRun();
    solveWholeQuiz(run);
    expect(() => run.complete(TOTAL_QUESTIONS)).toThrowError(RuleViolation);
    expect(run.completed).toBe(false);
  });

  it('closes the case and stamps the time', () => {
    const run = newRun();
    solveWholeQuiz(run);
    run.submitEthicalChoice(7, TOTAL_QUESTIONS);
    const at = new Date('2026-08-10T09:00:00.000Z');
    run.complete(TOTAL_QUESTIONS, at);
    expect(run.completed).toBe(true);
    expect(run.completedAt).toEqual(at);
  });

  it('is idempotent, so a retried submit does not move the timestamp', () => {
    const run = newRun();
    solveWholeQuiz(run);
    run.submitEthicalChoice(7, TOTAL_QUESTIONS);
    const first = new Date('2026-08-10T09:00:00.000Z');
    run.complete(TOTAL_QUESTIONS, first);
    run.complete(TOTAL_QUESTIONS, new Date('2026-08-10T10:00:00.000Z'));
    expect(run.completedAt).toEqual(first);
  });
});

describe('Investigation — stage authority', () => {
  it('reports investigate for an untouched run', () => {
    expect(newRun().stage(TOTAL_QUESTIONS)).toBe('investigate');
  });

  it('moves to quiz as soon as the learner engages with a question', () => {
    const run = newRun();
    run.revealHint(101, 3);
    expect(run.stage(TOTAL_QUESTIONS)).toBe('quiz');
  });

  it('counts a wrong answer as engagement', () => {
    const run = newRun();
    run.recordAnswer(101, 'locate', false);
    expect(run.stage(TOTAL_QUESTIONS)).toBe('quiz');
  });

  it('unlocks the debrief only once the quiz is complete', () => {
    const run = newRun();
    run.recordAnswer(101, 'locate', true);
    run.recordAnswer(102, 'explain', true);
    expect(run.stage(TOTAL_QUESTIONS)).toBe('quiz');

    run.recordAnswer(103, 'solve', true);
    expect(run.stage(TOTAL_QUESTIONS)).toBe('debrief');
  });
});

describe('Investigation — persistence round trip', () => {
  it('survives a snapshot and rehydrate unchanged', () => {
    const run = newRun();
    run.revealHint(101, 3);
    run.recordAnswer(101, 'locate', false);
    run.recordAnswer(101, 'locate', true);
    run.recordAnswer(102, 'explain', true);
    run.recordAnswer(103, 'solve', true);
    run.submitEthicalChoice(7, TOTAL_QUESTIONS);

    const restored = Investigation.fromSnapshot(run.toSnapshot());

    expect(restored.toSnapshot()).toEqual(run.toSnapshot());
    expect(restored.score.value).toBe(run.score.value);
    expect(restored.canRevealVulnerableLines()).toBe(true);
    expect(restored.hintsRevealedFor(101)).toBe(1);
    expect(restored.ethicalChoiceId).toBe(7);
  });

  it('rehydrates hint counts keyed by number, not by string', () => {
    // Object.fromEntries stringifies keys; the rehydrate path has to undo that or every
    // hint lookup silently returns 0 and hints become free.
    const run = Investigation.fromSnapshot({
      learnerId: LEARNER,
      scenarioId: SCENARIO,
      solvedQuestionIds: [],
      revealedHints: { 101: 2 },
      wrongAttempts: 0,
      vulnerableLinesUnlocked: false,
      ethicalChoiceId: null,
      completed: false,
      startedAt: new Date(),
      completedAt: null,
    });
    expect(run.hintsRevealedFor(101)).toBe(2);
    expect(run.hintsUsed).toBe(2);
  });
});
