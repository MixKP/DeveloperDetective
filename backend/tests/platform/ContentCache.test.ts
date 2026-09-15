import { describe, expect, it, vi } from 'vitest';
import { ContentCache } from '../../src/platform/cache/ContentCache.js';

const cacheAt = (clock: { value: number }, ttlMs = 1000) =>
  new ContentCache({ ttlMs, now: () => clock.value });

describe('ContentCache', () => {
  it('loads once and serves the rest from memory', async () => {
    const load = vi.fn().mockResolvedValue('content');
    const cache = cacheAt({ value: 0 });

    expect(await cache.get('k', load)).toBe('content');
    expect(await cache.get('k', load)).toBe('content');

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('loads again once the entry has expired', async () => {
    const clock = { value: 0 };
    const load = vi.fn().mockResolvedValue('content');
    const cache = cacheAt(clock, 1000);

    await cache.get('k', load);
    clock.value = 999;
    await cache.get('k', load);
    expect(load).toHaveBeenCalledTimes(1);

    clock.value = 1001;
    await cache.get('k', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps keys apart', async () => {
    const cache = cacheAt({ value: 0 });

    expect(await cache.get('a', async () => 1)).toBe(1);
    expect(await cache.get('b', async () => 2)).toBe(2);
    expect(await cache.get('a', async () => 99)).toBe(1);
  });

  /** A cold cache under load must not turn one miss into a query per request. */
  it('makes one call when several callers miss at the same time', async () => {
    let resolve: (value: string) => void = () => {};
    const load = vi.fn().mockReturnValue(
      new Promise<string>((r) => {
        resolve = r;
      }),
    );
    const cache = cacheAt({ value: 0 });

    const callers = [cache.get('k', load), cache.get('k', load), cache.get('k', load)];
    resolve('content');

    expect(await Promise.all(callers)).toEqual(['content', 'content', 'content']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed load', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue('content');
    const cache = cacheAt({ value: 0 });

    await expect(cache.get('k', load)).rejects.toThrow('down');

    expect(await cache.get('k', load)).toBe('content');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('is a pass-through when the ttl is zero', async () => {
    const load = vi.fn().mockResolvedValue('content');
    const cache = new ContentCache({ ttlMs: 0 });

    await cache.get('k', load);
    await cache.get('k', load);

    expect(cache.enabled).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
    expect(cache.size).toBe(0);
  });

  it('forgets everything when cleared', async () => {
    const load = vi.fn().mockResolvedValue('content');
    const cache = cacheAt({ value: 0 });

    await cache.get('k', load);
    cache.clear();
    await cache.get('k', load);

    expect(load).toHaveBeenCalledTimes(2);
  });
});
