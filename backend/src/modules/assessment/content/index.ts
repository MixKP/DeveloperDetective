import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Authored knowledge-test content, kept as data beside the module that owns it —
 * the same arrangement as the scenarios, and copied into `dist` at the mirrored
 * path so resolving from `import.meta.url` works from source and container alike.
 */
export const testsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tests');
