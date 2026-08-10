import { defineConfig } from 'drizzle-kit';

/**
 * Migrations run against the DIRECT connection (port 5432), never the transaction pooler.
 * PgBouncer in transaction mode cannot support the session-level operations DDL needs.
 */
const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  /**
   * Globbed straight at the modules rather than through a barrel file. Two reasons: a
   * barrel re-exporting with `.js` specifiers does not survive drizzle-kit's CJS bundling,
   * and more importantly there is then no file in the tree that hands one module a view of
   * another module's tables.
   */
  schema: './src/modules/*/infrastructure/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: url ?? '' },
  strict: true,
  verbose: true,
});
