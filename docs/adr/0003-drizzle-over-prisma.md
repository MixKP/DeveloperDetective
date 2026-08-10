# ADR 0003 — Drizzle rather than Prisma

**Status:** Accepted · 2026-08-10 (supersedes the Prisma choice in the v1 plan)

## Context

The v1 architecture assumed Prisma against MySQL in Docker. The stack moved to Supabase
PostgreSQL, which is a managed database reached through a connection pooler, and that changes
what a good ORM choice looks like.

## Decision

Use **Drizzle ORM** over `postgres.js`, with `drizzle-kit` for migrations.

Reasons, in order of how much they mattered:

1. **Schema is TypeScript, so it can live inside module folders.** This is what makes
   per-module table ownership a physical fact rather than a convention. A single monolithic
   `schema.prisma` would have quietly undermined the module boundaries in ADR 0001.
2. **No code-generation step or query engine binary.** Prisma's `generate` step and engine
   add real friction in a container build and against a pooled managed database.
3. **Pooler compatibility.** Drizzle over `postgres.js` with `prepare: false` works cleanly
   with Supabase's transaction pooler; Prisma needs extra `pgbouncer=true` handling.
4. **Migrations are plain reviewable SQL**, which is better evidence for a course report than
   an opaque migration format — and it let us hand-write the RLS migration.

## Consequences

- Drizzle's relational query API is less ergonomic than Prisma's for deep nesting. Mitigated
  by keeping every query inside a repository, where they are few and named.
- Fewer guardrails: `select()` with no argument returns every column, including secrets.
  This is why ADR 0002 requires explicit column selection everywhere outside
  `DrizzleAnswerKey`.
- `drizzle-kit` bundles config as CJS and cannot resolve the `.js` specifiers that NodeNext
  requires in source. The config therefore globs `./src/modules/*/infrastructure/schema.ts`
  directly instead of using a barrel file — which turned out better anyway, since no file in
  the tree now hands one module a view of another module's tables.
