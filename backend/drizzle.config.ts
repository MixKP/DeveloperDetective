import { defineConfig } from 'drizzle-kit';

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: './src/modules/*/infrastructure/schema.ts',
  out: './src/platform/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: url ?? '' },
  strict: true,
  verbose: true,
});
