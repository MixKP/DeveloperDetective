/**
 * A small in-process cache for content that only changes when the seed runs.
 *
 * Scenarios, questions, files, the answer key and the knowledge-test bank are
 * immutable between deployments, and every request re-read them from PostgreSQL —
 * a case page read every file of the scenario, the post-test read the whole bank.
 * Learner state is never cached here: progress and attempts are the two things
 * that change per request, and they go straight to the database.
 *
 * Bounded by time rather than by invalidation: the seed runs in its own process,
 * so nothing here could be told to drop an entry. Every deployment path restarts
 * the API after seeding; the TTL only has to cover the case where a warm instance
 * outlives a re-seed, and a few minutes of stale prose is the cost of being wrong.
 */
export interface ContentCacheOptions {
  ttlMs: number;
  /** Injected in tests; `Date.now` everywhere else. */
  now?: () => number;
}

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class ContentCache {
  private readonly entries = new Map<string, Entry<unknown>>();
  /** Loads already in flight, so a cold cache under load makes one query, not many. */
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly now: () => number;

  constructor(private readonly options: ContentCacheOptions) {
    this.now = options.now ?? Date.now;
  }

  /** `ttlMs: 0` turns the cache off entirely — every call loads. */
  get enabled(): boolean {
    return this.options.ttlMs > 0;
  }

  async get<T>(key: string, load: () => Promise<T>): Promise<T> {
    if (!this.enabled) return load();

    const entry = this.entries.get(key);
    if (entry && entry.expiresAt > this.now()) return entry.value as T;

    const pending = this.inFlight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = load()
      .then((value) => {
        this.entries.set(key, { value, expiresAt: this.now() + this.options.ttlMs });
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
