import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApiApp } from '../../src/composition.js';
import { CachedAnswerKey } from '../../src/modules/catalog/infrastructure/CachedAnswerKey.js';
import { CachedScenarioCatalog } from '../../src/modules/catalog/infrastructure/CachedScenarioCatalog.js';
import { ContentCache } from '../../src/platform/cache/ContentCache.js';
import {
  assessmentDeps,
  InMemoryInvestigationRepository,
  LEARNER,
  LOCATE_Q,
  SCENARIO_ID,
  StubAnswerKey,
  StubCatalog,
} from '../support/fakes.js';

/** Counts what actually reaches the database side of the port. */
class CountingCatalog extends StubCatalog {
  calls = 0;
  override async findById(scenarioId: number) {
    this.calls += 1;
    return super.findById(scenarioId);
  }
  override async listSummaries() {
    this.calls += 1;
    return super.listSummaries();
  }
}

let app: Express;
let catalog: CountingCatalog;

beforeEach(() => {
  catalog = new CountingCatalog();
  const cache = new ContentCache({ ttlMs: 60_000 });

  app = createApiApp({
    catalog: new CachedScenarioCatalog(catalog, cache),
    answerKey: new CachedAnswerKey(new StubAnswerKey(), cache),
    investigations: new InMemoryInvestigationRepository(),
    ...assessmentDeps(),
    pingDb: async () => true,
  });
});

const asLearner = (req: request.Test) => req.set('X-Learner-Id', LEARNER);

describe('the content cache', () => {
  it('reads authored content once, however many requests ask for it', async () => {
    await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);
    await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);
    await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);

    expect(catalog.calls).toBe(1);
  });

  /**
   * The point of the cache, and its danger. Content is shared and may be served
   * from memory; a learner's run is theirs and must never be.
   */
  it('still reports progress made between two identical requests', async () => {
    const before = await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);
    expect(before.body.state.solvedQuestionIds).toEqual([]);

    await asLearner(request(app).post(`/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/answer`))
      .send({ optionId: 'b' })
      .expect(200);

    const after = await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);

    expect(after.body.state.solvedQuestionIds).toEqual([LOCATE_Q]);
    expect(after.body.state.score).toBe(100);
    expect(catalog.calls).toBe(1);
  });

  it('keeps cached content from carrying one learner state into another', async () => {
    await asLearner(request(app).get(`/api/scenarios/${SCENARIO_ID}`)).expect(200);
    await asLearner(request(app).post(`/api/scenarios/${SCENARIO_ID}/questions/${LOCATE_Q}/answer`))
      .send({ optionId: 'b' })
      .expect(200);

    const other = await request(app)
      .get(`/api/scenarios/${SCENARIO_ID}`)
      .set('X-Learner-Id', '9f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f')
      .expect(200);

    expect(other.body.state.solvedQuestionIds).toEqual([]);
  });
});
