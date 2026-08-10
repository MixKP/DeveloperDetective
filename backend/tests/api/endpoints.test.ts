import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApiApp } from '../../src/composition.js';
import {
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

let app: Express;
let dbUp = true;

beforeEach(() => {
  dbUp = true;
  app = createApiApp({
    catalog: new StubCatalog(),
    answerKey: new StubAnswerKey(),
    investigations: new InMemoryInvestigationRepository(),
    pingDb: async () => dbUp,
  });
});

const asLearner = (req: request.Test) => req.set('X-Learner-Id', LEARNER);

describe('GET /api/health', () => {
  it('reports ok when the database answers', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });

  it('reports 503 when the database does not, so the container is marked unhealthy', async () => {
    dbUp = false;
    const res = await request(app).get('/api/health').expect(503);
    expect(res.body).toEqual({ status: 'degraded', db: 'unreachable' });
  });

  it('needs no learner id — it is a liveness probe, not a learner endpoint', async () => {
    await request(app).get('/api/health').expect(200);
  });
});

describe('learner identification', () => {
  it('rejects a request with no X-Learner-Id', async () => {
    const res = await request(app).get('/api/scenarios').expect(400);
    expect(res.body.error.code).toBe('MISSING_LEARNER_ID');
  });

  it('rejects a malformed X-Learner-Id rather than creating a junk row', async () => {
    const res = await request(app)
      .get('/api/scenarios')
      .set('X-Learner-Id', 'not-a-uuid')
      .expect(400);
    expect(res.body.error.code).toBe('MISSING_LEARNER_ID');
  });

  it('keeps two learners apart', async () => {
    await asLearner(request(app).post(`/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/answer`))
      .send({ optionId: 'b' })
      .expect(200);

    const other = await request(app)
      .get('/api/scenarios')
      .set('X-Learner-Id', '99999999-9999-4999-8999-999999999999')
      .expect(200);

    expect(other.body.scenarios[0].state).toBeNull();
  });
});

describe('GET /api/scenarios', () => {
  it('lists cases with null state before they are opened', async () => {
    const res = await asLearner(request(app).get('/api/scenarios')).expect(200);
    expect(res.body.scenarios).toHaveLength(1);
    expect(res.body.scenarios[0].state).toBeNull();
  });
});

describe('GET /api/scenarios/:id', () => {
  it('404s for an unknown scenario', async () => {
    const res = await asLearner(request(app).get('/api/scenarios/999')).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('400s on a non-numeric id', async () => {
    const res = await asLearner(request(app).get('/api/scenarios/abc')).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('serves the scoring rule so the UI never hardcodes penalties', async () => {
    const res = await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);
    expect(res.body.scoring).toEqual({
      base: 100,
      hintPenalty: 10,
      wrongAttemptPenalty: 15,
      floor: 20,
    });
  });
});

describe('POST answer', () => {
  it('400s when optionId is missing', async () => {
    const res = await asLearner(
      request(app).post(`/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/answer`),
    )
      .send({})
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details?.length).toBeGreaterThan(0);
  });

  it('422s when re-answering a solved question', async () => {
    const url = `/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/answer`;
    await asLearner(request(app).post(url)).send({ optionId: 'b' }).expect(200);

    const res = await asLearner(request(app).post(url)).send({ optionId: 'b' }).expect(422);
    expect(res.body.error.code).toBe('RULE_VIOLATION');
  });

  it('404s for a question that belongs to another scenario', async () => {
    await asLearner(request(app).post(`/api/scenarios/42/questions/${LOCATE_Q}/answer`))
      .send({ optionId: 'b' })
      .expect(404);
  });
});

describe('POST hint', () => {
  it('reveals one hint at a time and charges for it', async () => {
    const url = `/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/hint`;

    const first = await asLearner(request(app).post(url)).expect(200);
    expect(first.body.index).toBe(0);
    expect(first.body.state.score).toBe(90);

    const second = await asLearner(request(app).post(url)).expect(200);
    expect(second.body.index).toBe(1);
    expect(second.body.state.score).toBe(80);
  });

  it('422s past the last hint', async () => {
    const url = `/api/scenarios/${SCENARIO_ID}/questions/${EXPLAIN_Q}/hint`;
    await asLearner(request(app).post(url)).expect(200);
    const res = await asLearner(request(app).post(url)).expect(422);
    expect(res.body.error.code).toBe('RULE_VIOLATION');
  });
});

describe('POST /api/progress', () => {
  async function solveEverything() {
    for (const [qid, option] of [
      [LOCATE_Q, 'b'],
      [EXPLAIN_Q, 'a'],
      [SOLVE_Q, 'c'],
    ] as const) {
      await asLearner(request(app).post(`/api/scenarios/${SCENARIO_ID}/questions/${qid}/answer`))
        .send({ optionId: option })
        .expect(200);
    }
  }

  it('422s on an ethical choice made before the quiz is finished', async () => {
    const res = await asLearner(request(app).post('/api/progress'))
      .send({ scenarioId: SCENARIO_ID, completed: false, ethicalChoiceId: GOOD_CHOICE })
      .expect(422);
    expect(res.body.error.code).toBe('RULE_VIOLATION');
  });

  it('records the decision and reveals the consequence', async () => {
    await solveEverything();
    const res = await asLearner(request(app).post('/api/progress'))
      .send({ scenarioId: SCENARIO_ID, completed: true, ethicalChoiceId: GOOD_CHOICE })
      .expect(200);

    expect(res.body.state.completed).toBe(true);
    expect(res.body.ethicalOutcome.quality).toBe('good');
  });

  it('derives the score rather than trusting anything the client believes', async () => {
    await asLearner(
      request(app).post(`/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/hint`),
    ).expect(200);
    await asLearner(request(app).post(`/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/answer`))
      .send({ optionId: 'a' })
      .expect(200);
    await solveEverything();

    const res = await asLearner(request(app).post('/api/progress'))
      .send({ scenarioId: SCENARIO_ID, completed: true, ethicalChoiceId: GOOD_CHOICE })
      .expect(200);

    expect(res.body.state.score).toBe(75);
  });
});

describe('GET /api/progress', () => {
  it('returns empty stats for a learner who has done nothing', async () => {
    const res = await asLearner(request(app).get('/api/progress')).expect(200);
    expect(res.body.stats).toEqual({
      casesSolved: 0,
      casesStarted: 0,
      averageScore: null,
      hintsUsed: 0,
    });
  });
});

describe('unknown routes', () => {
  it('404s with the standard error envelope', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
