import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Authored scenario content — the deliverable of use-case authoring, kept as data
 * at the module root rather than buried under `infrastructure/seed/`, which is the
 * code that loads it. The JSON is copied into `dist` at the mirrored path, so
 * resolving from `import.meta.url` works from source and from the container alike.
 */
export const scenariosDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'scenarios',
);
