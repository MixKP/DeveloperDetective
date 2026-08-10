import { z } from 'zod';

/**
 * Environment, validated once at boot. A missing or malformed variable kills the process
 * immediately with a readable message, rather than surfacing as a confusing connection
 * failure on the first request an hour later.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),

  /**
   * Supabase's transaction pooler (port 6543). Used by the running API.
   * See db/client.ts for why prepared statements must be disabled against it.
   */
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  /**
   * Supabase's direct connection (port 5432). Migrations only — the pooler cannot support
   * the session-level features drizzle-kit needs. Optional at runtime because the API
   * process never uses it.
   */
  DIRECT_DATABASE_URL: z.string().optional(),

  CORS_ORIGINS: z.string().default(''),
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
