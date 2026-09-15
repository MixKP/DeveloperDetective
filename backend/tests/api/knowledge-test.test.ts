import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApiApp } from '../../src/composition.js';
import {
  assessmentDeps,
  closedCase,
  correctOptionFor,
  InMemoryInvestigationRepository,
  LEARNER,
  QUESTIONS_PER_ATTEMPT,
  StubAnswerKey,
  StubCatalog,
  TEST_Q1,
  wrongOptionFor,
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

const getTest = async (from: Express = app) =>
  (await asLearner(request(from).get('/api/tests/post')).expect(200)).body;

/** Sits whatever the current draw is, answering every question correctly or not. */
const sit = async (correctly: boolean, from: Express = app) => {
  const body = await getTest(from);
  const ids: number[] = body.questions.map((q: { id: number }) => q.id);

  return asLearner(request(from).post('/api/tests/post/attempt'))
    .send({
      responses: ids.map((id) => ({
        questionId: id,
        optionId: correctly ? correctOptionFor(id) : wrongOptionFor(id),
      })),
    })
    .expect(200);
};

describe('GET /api/tests/:variant', () => {
  it('serves one sitting of the bank, without the key or the feedback', async () => {
    const body = await getTest();

    expect(body.questions).toHaveLength(QUESTIONS_PER_ATTEMPT);
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('correctOption');
    expect(serialized).not.toContain('feedback');
    expect(serialized).not.toContain('clause');
    // Naming the principle a question turns on would name half the answer.
    expect(serialized).not.toContain('principle');
    expect(body.attempt).toBeNull();
    expect(body.attemptNumber).toBe(1);
    expect(body.history).toEqual([]);
    expect(body.eligibility).toEqual({
      eligible: true,
      casesCompleted: 1,
      casesRequired: 1,
      casesTotal: 1,
    });
  });

  it('deals the same sitting twice, so a reload does not reshuffle a half-answered test', async () => {
    const first = await getTest();
    const second = await getTest();

    expect(second.questions).toEqual(first.questions);
  });

  it('withholds the questions from a learner who has closed no case', async () => {
    const locked = appFor(new InMemoryInvestigationRepository());

    const res = await asLearner(request(locked).get('/api/tests/post')).expect(200);

    expect(res.body.questions).toEqual([]);
    expect(res.body.eligibility.eligible).toBe(false);
    expect(res.body.eligibility.casesCompleted).toBe(0);
    // The title and the description still travel, so the page can say what is
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
    const res = await sit(true);

    expect(res.body.attempt.score).toBe(QUESTIONS_PER_ATTEMPT);
    expect(res.body.attempt.total).toBe(QUESTIONS_PER_ATTEMPT);
    expect(res.body.attempt.attemptNumber).toBe(1);
  });

  it('tells a wrong answer which principle it breached, and what to revise', async () => {
    const res = await sit(false);

    expect(res.body.attempt.score).toBe(0);
    const [first] = res.body.attempt.answers;
    expect(first.correct).toBe(false);
    expect(first.feedback).toMatch(/Principle \d/);
    // Still carried for the item map and the results export, just not shown as a badge.
    expect(first.clause).toMatch(/^\d+\.\d+$/);

    const summary = res.body.attempt.summary;
    expect(summary.missed.length).toBeGreaterThan(0);
    expect(summary.missed[0].guidance).toMatch(/Re-read Principle/);
    expect(summary.mastered).toEqual([]);
    expect(summary.verdict).toMatch(/principle/i);
  });

  it('reports nothing to revise when every answer held', async () => {
    const res = await sit(true);

    expect(res.body.attempt.summary.missed).toEqual([]);
    expect(res.body.attempt.summary.mastered.length).toBeGreaterThan(0);
    expect(res.body.attempt.summary.verdict).toMatch(/every question held/i);
  });

  it('carries the prompt and the chosen option, so a result survives the next draw', async () => {
    const res = await sit(true);

    const [first] = res.body.attempt.answers;
    expect(first.prompt).not.toBe('');
    expect(first.selectedText).not.toBe('');
  });

  it('allows a retake, and draws questions the learner has not seen', async () => {
    const first = await getTest();
    await sit(true);

    const second = await getTest();

    expect(second.attemptNumber).toBe(2);
    expect(second.questions).toHaveLength(QUESTIONS_PER_ATTEMPT);
    const asked = (body: { questions: { id: number }[] }) => body.questions.map((q) => q.id).sort();
    expect(asked(second)).not.toEqual(asked(first));
    expect(asked(second).some((id) => asked(first).includes(id))).toBe(false);

    const res = await sit(false);
    expect(res.body.attempt.attemptNumber).toBe(2);
  });

  it('reports every sitting, oldest first', async () => {
    await sit(true);
    await sit(false);

    const body = await getTest();

    expect(body.history).toHaveLength(2);
    expect(body.history[0].attemptNumber).toBe(1);
    expect(body.history[0].score).toBe(QUESTIONS_PER_ATTEMPT);
    expect(body.history[1].score).toBe(0);
    // The latest sitting is the one rendered as a result.
    expect(body.attempt.attemptNumber).toBe(2);
  });

  it('refuses answers to questions this sitting did not ask', async () => {
    const body = await getTest();
    const asked: number[] = body.questions.map((q: { id: number }) => q.id);
    const notAsked = [TEST_Q1, 902, 903, 904].find((id) => !asked.includes(id))!;

    const res = await asLearner(request(app).post('/api/tests/post/attempt'))
      .send({
        responses: [
          { questionId: asked[0]!, optionId: 'a' },
          { questionId: notAsked, optionId: 'a' },
        ],
      })
      .expect(422);

    expect(res.body.error.message).toMatch(/does not ask/i);
  });

  it('refuses an attempt from a learner who has closed no case', async () => {
    const locked = appFor(new InMemoryInvestigationRepository());

    const res = await request(locked)
      .post('/api/tests/post/attempt')
      .set('X-Learner-Id', LEARNER)
      .send({ responses: [{ questionId: TEST_Q1, optionId: 'b' }] })
      .expect(422);

    expect(res.body.error.code).toBe('RULE_VIOLATION');
    expect(res.body.error.message).toMatch(/close 1 more case/i);
  });

  it('refuses a partial submission', async () => {
    const body = await getTest();

    const res = await asLearner(request(app).post('/api/tests/post/attempt'))
      .send({ responses: [{ questionId: body.questions[0].id, optionId: 'b' }] })
      .expect(422);

    expect(res.body.error.message).toMatch(/every question/i);
  });

  it('rejects a client-supplied score rather than ignoring it', async () => {
    const body = await getTest();

    await asLearner(request(app).post('/api/tests/post/attempt'))
      .send({
        score: 10,
        responses: body.questions.map((q: { id: number }) => ({
          questionId: q.id,
          optionId: 'a',
        })),
      })
      .expect(400);
  });

  it('replays the finished sitting on the next GET', async () => {
    await sit(false);

    const body = await getTest();

    expect(body.attempt.score).toBe(0);
    expect(body.attempt.answers).toHaveLength(QUESTIONS_PER_ATTEMPT);
    expect(body.attempt.answers[0].feedback).toMatch(/Breaches/);
  });
});
