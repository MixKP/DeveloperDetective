import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The migrations live beside this file and are copied into `dist` at the mirrored
 * path, so resolving from `import.meta.url` gives the same answer from source,
 * from the compiled output, and from the container.
 *
 * `drizzle.config.ts` repeats this path as a literal because drizzle-kit reads it
 * before any of this compiles — keep the two in step.
 */
export const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'migrations',
);
