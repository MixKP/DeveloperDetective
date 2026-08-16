import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

export type Database = ReturnType<typeof drizzle>;

export interface DbHandle {
  db: Database;
  ping: () => Promise<boolean>;
  close: () => Promise<void>;
}

export function createDb(
  connectionString: string,
  { maxConnections = 10 }: { maxConnections?: number } = {},
): DbHandle {
  const client = postgres(connectionString, {
    // Prepared statements do not survive a transaction-mode pooler.
    prepare: false,
    max: maxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
    // The pooler drops connections it considers idle, and a client holding the
    // closed socket only finds out when a query hangs on it. Recycling well inside
    // that window keeps a stale socket from becoming a stuck request.
    max_lifetime: 60 * 10,
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
