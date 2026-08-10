/**
 * @dd/shared — the HTTP contract between the API and the SPA.
 *
 * Scope is deliberately narrow: request/response schemas and the error envelope. No domain
 * logic lives here, and in particular no scoring rule. Scoring is a business rule and belongs
 * in the backend domain layer; the frontend renders the score the server sends it.
 */
export * from './primitives.js';
export * from './error.js';
export * from './scenario.js';
export * from './investigation.js';
export * from './progress.js';
