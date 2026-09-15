import { z } from 'zod';

const blankIsUnset = (value: unknown) => (value === '' ? undefined : value);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  DIRECT_DATABASE_URL: z.string().optional(),

  CORS_ORIGINS: z.string().default(''),

  // How long authored content may be served from memory. Content only changes when
  // the seed runs, and every deployment path restarts the API after seeding; this
  // bounds the exception, a warm instance that outlives a re-seed. 0 disables it.
  CONTENT_CACHE_TTL_MS: z.coerce.number().int().nonnegative().default(300_000),

  // Supabase auth. Both optional: with neither set the API runs anonymous-only.
  // Use the JWT secret for projects on legacy HS256 keys, the URL for asymmetric ones.
  //
  // An empty value means unset. Compose, CI and hosting platforms all express "no
  // value" as an empty string, and an empty SUPABASE_URL should leave the API
  // anonymous rather than fail the boot on a URL that was never provided.
  SUPABASE_URL: z.preprocess(blankIsUnset, z.string().url().optional()),
  SUPABASE_JWT_SECRET: z.preprocess(blankIsUnset, z.string().min(1).optional()),
});

export type Env = z.infer<typeof envSchema> & { corsOrigins: string[] };

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment:\n${issues.join('\n')}`);
  }

  return {
    ...parsed.data,
    corsOrigins: parsed.data.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}
