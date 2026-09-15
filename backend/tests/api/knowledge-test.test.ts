import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApiApp } from '../../src/composition.js';
import {
  assessmentDeps,
  closedCase,
  InMemoryInvestigationRepository,
  LEARNER,
  StubAnswerKey,
  StubCatalog,
  TEST_Q1,
  TEST_Q2,
} from '../support/fakes.js';

let app: Express;

/** The gate wants a closed case, so every test but the locked ones starts with one. */
const appFor = (investigations: InMemoryInvestigationRepository) =>
  createApiApp({
    catalog: new StubCatalog(),
    answerKey: new StubAnswerKey(),
    investigations,
    ...assessmentDeps(),
    pingDb: async () => true,
  });

beforeEach(async () => {
  const investigations = new InMemoryInvestigationRepository();
  await investigations.save(closedCase());
  app = appFor(investigations);
});

const asLearner = (req: request.Test) => req.set('X-Learner-Id', LEARNER);

const submit = (answers: [string, string]) =>
  asLearner(request(app).post('/api/tests/post/attempt')).send({
    responses: [
      { questionId: TEST_Q1, optionId: answers[0] },
      { questionId: TEST_Q2, optionId: answers[1] },
    ],
  });

describe('GET /api/tests/:variant', () => {
  it('serves the questions without the key or the feedback', async () => {
    const res = await asLearner(request(app).get('/api/tests/post')).expect(200);

    expect(res.body.questions).toHaveLength(2);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('correctOption');
    expect(serialized).not.toContain('feedback');
    expect(serialized).not.toContain('clause');
    expect(res.body.attempt).toBeNull();
    expect(res.body.eligibility).toEqual({
      eligible: true,
      casesCompleted: 1,
      casesRequired: 1,
      casesTotal: 1,
    });
  });

  it('withholds the questions from a learner who has closed no case', async () => {
    const locked = appFor(new InMemoryInvestigationRepository());

    const res = await asLearner(request(locked).get('/api/tests/post')).expect(200);

    expect(res.body.questions).toEqual([]);
    expect(res.body.eligibility.eligible).toBe(false);
    expect(res.body.eligibility.casesCompleted).toBe(0);
    // The title and the description still travel, so the dashboard can say what is
    // locked rather than showing an empty card.
    expect(res.body.title).toBe('Core professional ethics');
  });

  it('refuses a variant the schema does not define', async () => {
    await asLearner(request(app).get('/api/tests/midterm')).expect(400);
  });

  it('needs a learner, like every other content route', async () => {
    await request(app).get('/api/tests/post').expect(400);
  });
});

describe('POST /api/tests/:variant/attempt', () => {
  it('grades the submission and derives the score', async () => {
    const res = await submit(['b', 'a']).expect(200);

    expect(res.body.attempt.score).toBe(2);
    expect(res.body.attempt.total).toBe(2);
  });

  it('tells a wrong answer which principle it breached', async () => {
    const res = await submit(['a', 'b']).expect(200);

    expect(res.body.attempt.score).toBe(0);
    const [first, second] = res.body.attempt.answers;
    expect(first.correct).toBe(false);
    expect(first.principle).toBe('public');
    // Still carried for the item map and the results export, just not shown as a badge.
    expect(first.clause).toBe('1.04');
    expect(first.feedback).toContain('Principle 1');
    expect(second.principle).toBe('product');
    expect(second.feedback).toContain('Principle 3');
  });

  it('returns the feedback for the option chosen, not for the right one', async () => {
    const res = await submit(['a', 'a']).expect(200);

    const [wrong, right] = res.body.attempt.answers;
    expect(wrong.feedback).toContain('Breaches');
    expect(right.feedback).toContain('Correct');
  });

  it('refuses a second sitting', async () => {
    await submit(['b', 'a']).expect(200);
    const res = await submit(['b', 'a']).expect(422);

    expect(res.body.error.code).toBe('RULE_VIOLATION');
    expect(res.body.error.message).toMatch(/cannot be retaken/i);
  });

  it('refuses an attempt from a learner who has closed no case', async () => {
    const locked = appFor(new InMemoryInvestigationRepository());

    const res = await request(locked)
      .post('/api/tests/post/attempt')
      .set('X-Learner-Id', LEARNER)
      .send({
        responses: [
          { questionId: TEST_Q1, optionId: 'b' },
          { questionId: TEST_Q2, optionId: 'a' },
        ],
      })
      .expect(422);

    expect(res.body.error.code).toBe('RULE_VIOLATION');
    expect(res.body.error.message).toMatch(/close 1 more case/i);
  });

  it('refuses a partial submission', async () => {
    const res = await asLearner(request(app).post('/api/tests/post/attempt'))
      .send({ responses: [{ questionId: TEST_Q1, optionId: 'b' }] })
      .expect(422);

    expect(res.body.error.message).toMatch(/every question/i);
  });

  it('rejects a client-supplied score rather than ignoring it', async () => {
    await asLearner(request(app).post('/api/tests/post/attempt'))
      .send({
        score: 10,
        responses: [
          { questionId: TEST_Q1, optionId: 'b' },
          { questionId: TEST_Q2, optionId: 'a' },
        ],
      })
      .expect(400);
  });

  it('replays the finished attempt on the next GET', async () => {
    await submit(['b', 'b']).expect(200);
    const res = await asLearner(request(app).get('/api/tests/post')).expect(200);

    expect(res.body.attempt.score).toBe(1);
    expect(res.body.attempt.answers).toHaveLength(2);
    expect(res.body.attempt.answers[1].feedback).toContain('Breaches');
  });
});
