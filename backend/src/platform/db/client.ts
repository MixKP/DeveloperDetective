import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

export type Database = ReturnType<typeof drizzle>;

export interface DbHandle {
  db: Database;
  ping: () => Promise<boolean>;
  close: () => Promise<void>;
}

/**
 * Connects to Supabase PostgreSQL.
 *
 * `prepare: false` is not optional and not a style choice. Supabase's transaction pooler is
 * PgBouncer in transaction mode, which hands a different backend connection to each
 * statement — prepared statements do not survive that. With prepare left on, the app works
 * locally against a direct connection and then fails in the container with an opaque
 * "prepared statement does not exist" error. This is the single most common way this stack
 * breaks, so it is pinned here rather than in configuration.
 */
export function createDb(connectionString: string): DbHandle {
  const client = postgres(connectionString, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db = drizzle(client);

  return {
    db,
    ping: async () => {
      try {
        await db.execute(sql`select 1`);
        return true;
      } catch {
        return false;
      }
    },
    close: () => client.end({ timeout: 5 }),
  };
}
