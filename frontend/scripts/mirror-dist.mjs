import { cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(frontend, 'dist');
const mirror = path.join(frontend, '..', 'dist');

rmSync(mirror, { recursive: true, force: true });
cpSync(source, mirror, { recursive: true });

console.log(`mirrored ${source} -> ${mirror}`);
