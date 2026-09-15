import type { ContentCache } from '../../../platform/cache/ContentCache.js';
import type { KnowledgeTestCatalog } from '../application/ports.js';
import type { KnowledgeTestContent, TestVariant } from '../domain/readModels.js';

/**
 * The knowledge-test bank, memoised. It is the largest static read in the app —
 * every question of the bank, with its options, so that a sitting can be drawn
 * from it — and both the dashboard and the post-test page ask for it.
 */
export class CachedKnowledgeTestCatalog implements KnowledgeTestCatalog {
  constructor(
    private readonly inner: KnowledgeTestCatalog,
    private readonly cache: ContentCache,
  ) {}

  findByVariant(variant: TestVariant): Promise<KnowledgeTestContent | null> {
    return this.cache.get(`test:${variant}`, () => this.inner.findByVariant(variant));
  }
}
