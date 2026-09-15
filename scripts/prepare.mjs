import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

/**
 * Build `@dd/shared` after an install.
 *
 * The API and the SPA both import the contract as compiled JavaScript, so a fresh
 * clone cannot run `dev:api`, `test` or `typecheck` until it has been built once —
 * it fails with ERR_MODULE_NOT_FOUND on `@dd/shared/dist/index.js`, which is a
 * confusing first impression of a repo that installed without complaint. `prepare`
 * is the one hook npm runs after `npm install` and `npm ci`, so it happens here.
 *
 * Two installs must not build, and both are detected rather than configured:
 * Docker's `deps` stage installs before any source is copied, and a
 * production-only install has no compiler. Neither is an error.
 */
const require = createRequire(import.meta.url);

if (!existsSync(new URL('../shared/src/index.ts', import.meta.url))) {
  process.exit(0); // installing without the sources — Docker's deps stage
}

try {
  require.resolve('typescript');
} catch {
  process.exit(0); // production install: nothing here will be compiled
}

const result = spawnSync('npm', ['run', 'build', '-w', '@dd/shared'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

// A broken contract should fail the build that needs it, not the install. Saying so
// beats an install that dies with a compiler error somebody did not ask for yet.
if (result.status !== 0) {
  console.warn('\nprepare: could not build @dd/shared. Run `npm run build -w @dd/shared`.');
}
