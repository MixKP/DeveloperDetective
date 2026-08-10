import { beforeEach, describe, expect, it } from 'vitest';
import { AnswerQuestion } from '../../src/modules/investigation/application/AnswerQuestion.js';
import { GetProgress } from '../../src/modules/investigation/application/GetProgress.js';
import { GetScenarioDetail } from '../../src/modules/investigation/application/GetScenarioDetail.js';
import { GetScenarioList } from '../../src/modules/investigation/application/GetScenarioList.js';
import { RequestHint } from '../../src/modules/investigation/application/RequestHint.js';
import { SubmitProgress } from '../../src/modules/investigation/application/SubmitProgress.js';
import { NotFoundError } from '../../src/modules/investigation/application/errors.js';
import { RuleViolation } from '../../src/modules/investigation/domain/errors.js';
import {
  BAD_CHOICE,
  EXPLAIN_Q,
  GOOD_CHOICE,
  InMemoryInvestigationRepository,
  LEARNER,
  LOCATE_Q,
  SCENARIO_ID,
  SOLVE_Q,
  StubAnswerKey,
  StubCatalog,
} from '../support/fakes.js';

let catalog: StubCatalog;
let answerKey: StubAnswerKey;
let repo: InMemoryInvestigationRepository;

let answer: AnswerQuestion;
let hint: RequestHint;
let detail: GetScenarioDetail;
let list: GetScenarioList;
let submit: SubmitProgress;
let progress: GetProgress;

beforeEach(() => {
  catalog = new StubCatalog();
  answerKey = new StubAnswerKey();
  repo = new InMemoryInvestigationRepository();

  answer = new AnswerQuestion(catalog, answerKey, repo);
  hint = new RequestHint(catalog, answerKey, repo);
  detail = new GetScenarioDetail(catalog, answerKey, repo);
  list = new GetScenarioList(catalog, repo);
  submit = new SubmitProgress(catalog, answerKey, repo);
  progress = new GetProgress(catalog, repo);
});

async function solveEverything() {
  await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
  await answer.execute(LEARNER, SCENARIO_ID, EXPLAIN_Q, 'a');
  await answer.execute(LEARNER, SCENARIO_ID, SOLVE_Q, 'c');
}

describe('AnswerQuestion', () => {
  it('withholds the explanation on a wrong answer', async () => {
    const result = await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'a');
    expect(result.correct).toBe(false);
    expect(result.explanation).toBeNull();
    expect(result.state.wrongAttempts).toBe(1);
    expect(result.state.score).toBe(85);
  });

  it('returns the explanation on a correct answer', async () => {
    const result = await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
    expect(result.correct).toBe(true);
    expect(result.explanation).toContain('line 42');
  });

  it('flags the transition when a locate answer unlocks the reveal', async () => {
    const result = await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
    expect(result.justUnlockedVulnerableLines).toBe(true);
    expect(result.state.vulnerableLinesUnlocked).toBe(true);
  });

  it('does not re-flag the unlock on later answers', async () => {
    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
    const second = await answer.execute(LEARNER, SCENARIO_ID, EXPLAIN_Q, 'a');
    expect(second.justUnlockedVulnerableLines).toBe(false);
    expect(second.state.vulnerableLinesUnlocked).toBe(true);
  });

  it('does not unlock the reveal from a non-locate question', async () => {
    const result = await answer.execute(LEARNER, SCENARIO_ID, EXPLAIN_Q, 'a');
    expect(result.state.vulnerableLinesUnlocked).toBe(false);
  });

  it('persists the run', async () => {
    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
    const stored = await repo.find(LEARNER, SCENARIO_ID);
    expect(stored?.hasSolved(LOCATE_Q)).toBe(true);
  });

  it('refuses to grade a question belonging to another scenario', async () => {
    await expect(answer.execute(LEARNER, 999, LOCATE_Q, 'b')).rejects.toThrow(NotFoundError);
  });

  it('refuses to re-answer a solved question', async () => {
    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
    await expect(answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'a')).rejects.toThrow(
      RuleViolation,
    );
  });
});

describe('RequestHint', () => {
  it('reveals hints in order and charges for each', async () => {
    const first = await hint.execute(LEARNER, SCENARIO_ID, LOCATE_Q);
    expect(first.index).toBe(0);
    expect(first.total).toBe(3);
    expect(first.state.score).toBe(90);

    const second = await hint.execute(LEARNER, SCENARIO_ID, LOCATE_Q);
    expect(second.index).toBe(1);
    expect(second.state.hintsUsed).toBe(2);
    expect(second.state.score).toBe(80);
  });

  it('refuses to sell more hints than exist, and does not charge for the refusal', async () => {
    await hint.execute(LEARNER, SCENARIO_ID, EXPLAIN_Q);
    await expect(hint.execute(LEARNER, SCENARIO_ID, EXPLAIN_Q)).rejects.toThrow(RuleViolation);
    const stored = await repo.find(LEARNER, SCENARIO_ID);
    expect(stored?.hintsUsed).toBe(1);
  });

  it('refuses to sell a hint for a solved question', async () => {
    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
    await expect(hint.execute(LEARNER, SCENARIO_ID, LOCATE_Q)).rejects.toThrow(RuleViolation);
  });
});

describe('GetScenarioDetail — gating', () => {
  it('hides vulnerable lines until the locate question is solved', async () => {
    const before = await detail.execute(LEARNER, SCENARIO_ID);
    expect(before.files.every((f) => f.vulnerableLines.length === 0)).toBe(true);

    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');

    const after = await detail.execute(LEARNER, SCENARIO_ID);
    const authFile = after.files.find((f) => f.path === 'src/auth.service.ts');
    expect(authFile?.vulnerableLines).toEqual([42, 43]);
  });

  it('does not reveal lines for a merely attempted locate question', async () => {
    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'a');
    const view = await detail.execute(LEARNER, SCENARIO_ID);
    expect(view.files.every((f) => f.vulnerableLines.length === 0)).toBe(true);
  });

  it('withholds the debrief until every question is solved', async () => {
    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
    expect((await detail.execute(LEARNER, SCENARIO_ID)).debrief).toBeNull();

    await answer.execute(LEARNER, SCENARIO_ID, EXPLAIN_Q, 'a');
    await answer.execute(LEARNER, SCENARIO_ID, SOLVE_Q, 'c');

    const view = await detail.execute(LEARNER, SCENARIO_ID);
    expect(view.debrief?.rootCause).toContain('concatenated');
  });

  it('sends only hints already paid for', async () => {
    await hint.execute(LEARNER, SCENARIO_ID, LOCATE_Q);
    const view = await detail.execute(LEARNER, SCENARIO_ID);
    const q = view.questions.find((x) => x.id === LOCATE_Q);
    expect(q?.hintsRevealed).toEqual(['Look at how the query is built.']);
    expect(q?.hintsTotal).toBe(3);
  });

  it('sends no explanation for an unsolved question', async () => {
    const view = await detail.execute(LEARNER, SCENARIO_ID);
    expect(view.questions.every((q) => q.explanation === null)).toBe(true);
  });

  it('replays the explanation for a solved question', async () => {
    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
    const view = await detail.execute(LEARNER, SCENARIO_ID);
    expect(view.questions.find((q) => q.id === LOCATE_Q)?.explanation).toContain('line 42');
  });

  it('offers ethical choices without their quality or outcome', async () => {
    const view = await detail.execute(LEARNER, SCENARIO_ID);
    expect(view.ethicalChoices).toHaveLength(2);
    for (const choice of view.ethicalChoices) {
      expect(Object.keys(choice).sort()).toEqual(['id', 'text']);
    }
    expect(view.ethicalOutcome).toBeNull();
  });

  it('starts a run on first open so the stage machine has state', async () => {
    expect(await repo.find(LEARNER, SCENARIO_ID)).toBeNull();
    const view = await detail.execute(LEARNER, SCENARIO_ID);
    expect(view.state.stage).toBe('investigate');
    expect(await repo.find(LEARNER, SCENARIO_ID)).not.toBeNull();
  });

  it('serves the scoring rule so the UI never hardcodes it', async () => {
    const view = await detail.execute(LEARNER, SCENARIO_ID);
    expect(view.scoring).toEqual({
      base: 100,
      hintPenalty: 10,
      wrongAttemptPenalty: 15,
      floor: 20,
    });
  });

  it('rejects an unknown scenario', async () => {
    await expect(detail.execute(LEARNER, 999)).rejects.toThrow(NotFoundError);
  });
});

describe('SubmitProgress', () => {
  it('refuses an ethical choice before the quiz is finished', async () => {
    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
    await expect(
      submit.execute(LEARNER, {
        scenarioId: SCENARIO_ID,
        completed: false,
        ethicalChoiceId: GOOD_CHOICE,
      }),
    ).rejects.toThrow(RuleViolation);
  });

  it('records the choice and reveals its consequence', async () => {
    await solveEverything();
    const result = await submit.execute(LEARNER, {
      scenarioId: SCENARIO_ID,
      completed: true,
      ethicalChoiceId: GOOD_CHOICE,
    });
    expect(result.ethicalOutcome?.quality).toBe('good');
    expect(result.ethicalOutcome?.outcome).toContain('No customer data');
    expect(result.state.completed).toBe(true);
    expect(result.state.score).toBe(100);
  });

  it('refuses to retake a decision already made', async () => {
    await solveEverything();
    await submit.execute(LEARNER, {
      scenarioId: SCENARIO_ID,
      completed: false,
      ethicalChoiceId: BAD_CHOICE,
    });
    await expect(
      submit.execute(LEARNER, {
        scenarioId: SCENARIO_ID,
        completed: true,
        ethicalChoiceId: GOOD_CHOICE,
      }),
    ).rejects.toThrow(RuleViolation);
  });

  it('refuses to close a case with no decision made', async () => {
    await solveEverything();
    await expect(
      submit.execute(LEARNER, { scenarioId: SCENARIO_ID, completed: true }),
    ).rejects.toThrow(RuleViolation);
  });

  it('rejects an ethical choice that belongs to no scenario', async () => {
    await solveEverything();
    await expect(
      submit.execute(LEARNER, { scenarioId: SCENARIO_ID, completed: false, ethicalChoiceId: 9999 }),
    ).rejects.toThrow(NotFoundError);
  });

  it('derives the score from server counters, since the request cannot carry one', async () => {
    await hint.execute(LEARNER, SCENARIO_ID, LOCATE_Q);
    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'a');
    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
    await answer.execute(LEARNER, SCENARIO_ID, EXPLAIN_Q, 'a');
    await answer.execute(LEARNER, SCENARIO_ID, SOLVE_Q, 'c');

    const result = await submit.execute(LEARNER, {
      scenarioId: SCENARIO_ID,
      completed: true,
      ethicalChoiceId: GOOD_CHOICE,
    });
    expect(result.state.score).toBe(75);
  });
});

describe('GetScenarioList', () => {
  it('reports null state for a case never opened', async () => {
    const result = await list.execute(LEARNER);
    expect(result.scenarios).toHaveLength(1);
    expect(result.scenarios[0]?.state).toBeNull();
  });

  it('reports live state once the case is under way', async () => {
    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
    const result = await list.execute(LEARNER);
    expect(result.scenarios[0]?.state?.solvedQuestionIds).toEqual([LOCATE_Q]);
    expect(result.scenarios[0]?.state?.stage).toBe('quiz');
  });

  it('keeps learners separate', async () => {
    await answer.execute(LEARNER, SCENARIO_ID, LOCATE_Q, 'b');
    const other = await list.execute('99999999-9999-4999-8999-999999999999');
    expect(other.scenarios[0]?.state).toBeNull();
  });
});

describe('GetProgress', () => {
  it('reports empty stats for a new learner', async () => {
    const result = await progress.execute(LEARNER);
    expect(result.records).toEqual([]);
    expect(result.stats).toEqual({
      casesSolved: 0,
      casesStarted: 0,
      averageScore: null,
      hintsUsed: 0,
    });
  });

  it('counts a started but unfinished case without averaging it in', async () => {
    await hint.execute(LEARNER, SCENARIO_ID, LOCATE_Q);
    const result = await progress.execute(LEARNER);
    expect(result.stats.casesStarted).toBe(1);
    expect(result.stats.casesSolved).toBe(0);
    expect(result.stats.averageScore).toBeNull();
    expect(result.stats.hintsUsed).toBe(1);
  });

  it('averages completed cases only', async () => {
    await hint.execute(LEARNER, SCENARIO_ID, LOCATE_Q);
    await solveEverything();
    await submit.execute(LEARNER, {
      scenarioId: SCENARIO_ID,
      completed: true,
      ethicalChoiceId: GOOD_CHOICE,
    });

    const result = await progress.execute(LEARNER);
    expect(result.stats.casesSolved).toBe(1);
    expect(result.stats.averageScore).toBe(90);
    expect(result.records[0]?.scenarioTitle).toContain('Authentication bypass');
    expect(result.records[0]?.completedAt).not.toBeNull();
  });
});
