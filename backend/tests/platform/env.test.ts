import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/platform/env.js';

const base = { DATABASE_URL: 'postgresql://user:pass@localhost:5432/db' };

describe('loadEnv', () => {
  it('runs anonymous-only when no Supabase credentials are given', () => {
    const env = loadEnv({ ...base });

    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.SUPABASE_JWT_SECRET).toBeUndefined();
  });

  /** Compose, CI and hosting platforms all spell "no value" as an empty string. */
  it('treats an empty Supabase value as unset rather than as a broken URL', () => {
    const env = loadEnv({ ...base, SUPABASE_URL: '', SUPABASE_JWT_SECRET: '' });

    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.SUPABASE_JWT_SECRET).toBeUndefined();
  });

  it('still refuses a value that is present and wrong', () => {
    expect(() => loadEnv({ ...base, SUPABASE_URL: 'not-a-url' })).toThrowError(/SUPABASE_URL/);
  });

  it('keeps the content cache on by default, and lets it be turned off', () => {
    expect(loadEnv({ ...base }).CONTENT_CACHE_TTL_MS).toBe(300_000);
    expect(loadEnv({ ...base, CONTENT_CACHE_TTL_MS: '0' }).CONTENT_CACHE_TTL_MS).toBe(0);
  });
});
