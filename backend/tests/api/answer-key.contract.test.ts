import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApiApp } from '../../src/composition.js';
import {
  GOOD_CHOICE,
  InMemoryInvestigationRepository,
  LEARNER,
  LOCATE_Q,
  SCENARIO_ID,
  StubAnswerKey,
  StubCatalog,
} from '../support/fakes.js';

/**
 * THE NON-NEGOTIABLE TEST.
 *
 * The product's core security property is that the browser never receives the answer key.
 * Everything else — the AnswerKey port, the gating in the use cases — exists to make that
 * true by construction. This test is the tripwire that proves it stayed true, and it is
 * cheap enough that there is no excuse for not having it.
 *
 * It works by value as well as by key name, because a leak that renamed the field would
 * still be a leak.
 */

const FORBIDDEN_KEYS = ['correctOption', 'correct_option', 'answerKey', 'hints'];

/** Secrets that must never appear anywhere in a payload, whatever the field is called. */
const FORBIDDEN_VALUES = [
  'Parameterized queries keep data out of the SQL grammar entirely.', // solve explanation
  'Line 42.', // an unpurchased hint
  'Check auth.service.ts.', // an unpurchased hint
];

function collectKeys(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, found);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      found.push(key);
      collectKeys(child, found);
    }
  }
  return found;
}

let app: Express;

beforeEach(() => {
  app = createApiApp({
    catalog: new StubCatalog(),
    answerKey: new StubAnswerKey(),
    investigations: new InMemoryInvestigationRepository(),
    pingDb: async () => true,
  });
});

const asLearner = (req: request.Test) => req.set('X-Learner-Id', LEARNER);

describe('the answer key never reaches the client', () => {
  it('is absent from a fresh scenario payload', async () => {
    const res = await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);

    const keys = collectKeys(res.body);
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(keys, `payload leaked "${forbidden}"`).not.toContain(forbidden);
    }

    const serialized = JSON.stringify(res.body);
    for (const secret of FORBIDDEN_VALUES) {
      expect(serialized, `payload leaked the value "${secret}"`).not.toContain(secret);
    }
  });

  it('is still absent after the learner has been working the case', async () => {
    await asLearner(
      request(app).post(`/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/hint`),
    ).expect(200);
    await asLearner(request(app).post(`/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/answer`))
      .send({ optionId: 'b' })
      .expect(200);

    const res = await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);
    const keys = collectKeys(res.body);
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(keys).not.toContain(forbidden);
    }
    // The purchased hint is allowed through; the ones not paid for are not.
    expect(JSON.stringify(res.body)).toContain('Look at how the query is built.');
    expect(JSON.stringify(res.body)).not.toContain('Check auth.service.ts.');
  });

  it('is absent from a wrong-answer response', async () => {
    const res = await asLearner(
      request(app).post(`/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/answer`),
    )
      .send({ optionId: 'a' })
      .expect(200);

    expect(res.body.correct).toBe(false);
    expect(res.body.explanation).toBeNull();
    expect(collectKeys(res.body)).not.toContain('correctOption');
  });

  it('does not ship ethical quality or outcome before a decision is made', async () => {
    const res = await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);

    expect(res.body.ethicalOutcome).toBeNull();
    for (const choice of res.body.ethicalChoices) {
      expect(Object.keys(choice).sort()).toEqual(['id', 'text']);
    }
    expect(JSON.stringify(res.body)).not.toContain('No customer data was exposed');
  });

  it('does not ship the debrief before the quiz is finished', async () => {
    const res = await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);
    expect(res.body.debrief).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain('concatenated into a SQL string');
  });

  it('does not ship vulnerable lines before the locate question is solved', async () => {
    const res = await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);
    for (const file of res.body.files) {
      expect(file.vulnerableLines).toEqual([]);
    }
  });

  it('ships vulnerable lines once the locate question is solved', async () => {
    await asLearner(request(app).post(`/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/answer`))
      .send({ optionId: 'b' })
      .expect(200);

    const res = await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);
    const authFile = res.body.files.find((f: { path: string }) => f.path === 'src/auth.service.ts');
    expect(authFile.vulnerableLines).toEqual([42, 43]);
  });
});

describe('score integrity at the HTTP boundary', () => {
  it('rejects a client-supplied score outright rather than ignoring it', async () => {
    const res = await asLearner(request(app).post('/api/progress'))
      .send({ scenarioId: SCENARIO_ID, completed: true, ethicalChoiceId: GOOD_CHOICE, score: 100 })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
