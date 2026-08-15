import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApiApp } from '../../src/composition.js';
import { createTokenVerifier } from '../../src/platform/http/token.js';
import {
  InMemoryInvestigationRepository,
  LEARNER,
  LOCATE_Q,
  SCENARIO_ID,
  StubAnswerKey,
  StubCatalog,
} from '../support/fakes.js';

const ACCOUNT = 'b21c5c04-6d6a-4a09-9a0e-6e4b7c1d2f30';

/** Stands in for Supabase: one token is good, everything else is not. */
const verifyToken = async (token: string) => {
  if (token !== 'good-token') throw new Error('bad token');
  return ACCOUNT;
};

let app: Express;

beforeEach(() => {
  app = createApiApp({
    catalog: new StubCatalog(),
    answerKey: new StubAnswerKey(),
    investigations: new InMemoryInvestigationRepository(),
    pingDb: async () => true,
    verifyToken,
  });
});

describe('bearer authentication', () => {
  it('accepts a verified token and uses its subject as the learner id', async () => {
    await request(app)
      .post(`/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/answer`)
      .set('Authorization', 'Bearer good-token')
      .send({ optionId: 'b' })
      .expect(200);

    // The same account sees that progress back.
    const mine = await request(app)
      .get('/api/progress')
      .set('Authorization', 'Bearer good-token')
      .expect(200);
    expect(mine.body.stats.casesStarted).toBe(1);

    // An anonymous learner is a different person entirely.
    const anonymous = await request(app)
      .get('/api/progress')
      .set('X-Learner-Id', LEARNER)
      .expect(200);
    expect(anonymous.body.stats.casesStarted).toBe(0);
  });

  it('rejects a token it cannot verify instead of falling back to anonymous', async () => {
    const res = await request(app)
      .get('/api/scenarios')
      .set('Authorization', 'Bearer forged')
      .set('X-Learner-Id', LEARNER)
      .expect(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('still allows the anonymous header when no token is sent', async () => {
    await request(app).get('/api/scenarios').set('X-Learner-Id', LEARNER).expect(200);
  });
});

describe('deployments without auth configured', () => {
  it('rejects bearer tokens outright rather than trusting them', async () => {
    const anonymousOnly = createApiApp({
      catalog: new StubCatalog(),
      answerKey: new StubAnswerKey(),
      investigations: new InMemoryInvestigationRepository(),
      pingDb: async () => true,
    });

    const res = await request(anonymousOnly)
      .get('/api/scenarios')
      .set('Authorization', 'Bearer good-token')
      .expect(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

describe('createTokenVerifier', () => {
  it('returns undefined when neither a secret nor a project url is configured', () => {
    expect(createTokenVerifier({})).toBeUndefined();
  });

  it('rejects a token signed with a different secret', async () => {
    const verify = createTokenVerifier({ jwtSecret: 'a'.repeat(40) });
    await expect(verify?.('not.a.jwt')).rejects.toThrow();
  });
});
