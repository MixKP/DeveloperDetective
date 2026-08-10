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
    prepare: false,
    max: maxConnections,
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
