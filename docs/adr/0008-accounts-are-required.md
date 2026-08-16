# ADR 0008 — Accounts are required, and the gate is server-side

**Status:** Accepted · 2026-08-16 · supersedes the optionality in [ADR 0007](0007-supabase-auth-behind-the-learner-id-seam.md)

## Context

ADR 0007 added Supabase Auth but left it optional: a learner could sign in, or carry on
under the anonymous identifier of [ADR 0006](0006-anonymous-learner-id.md). The reasoning
was that user testing should have no signup step in front of it.

In use that turned out to be the wrong default. Nothing in the app asks a learner to
identify themselves, so nobody does, and the account feature is invisible — a deployment
looks exactly as it did before accounts existed. Cases are also framed as assigned work
("you are the engineer on call"), which reads oddly when anyone can arrive and start.

## Decision

**Signing in is required before any part of the app.** A route guard sends every
unauthenticated visit to `/auth`, and the API refuses `X-Learner-Id` outright whenever a
token verifier is configured.

Both halves matter. A guard alone is a client-side check, and a client-side check is
advice, not a gate — dropping a header would walk straight past it. That is precisely the
failure this project teaches learners to spot, so the server is the boundary and the guard
is only there to save a round-trip.

The anonymous path is not deleted; it is now conditional on the deployment. A build with
no Supabase credentials keeps the ADR 0006 identifier, because such a build has no way to
sign anyone in and locking it would brick local development, CI, and `docker compose up`.
Configuration decides which of the two the deployment is, and it can never be both.

## Consequences

- No use case or table changed. The `req.learnerId` seam of ADR 0006 still hides which
  credential produced the id.
- Progress now always follows the learner across devices, since there is always an account.
- Week 4 user testing gains a signup step. That cost is accepted: it is one form, and it
  buys the assignment framing the scenarios are written around.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are inlined at build time, so a deploy
  that omits them silently produces an ungated anonymous build. The README says so next to
  the deployment steps, because the failure is quiet and looks like a missing feature.
- The route guard must await session restore. vue-router starts its first navigation when
  the router is installed — before anything mounts — so a guard that reads `signedIn`
  without waiting bounces every deep link to the sign-in page and then to the dashboard.
- e2e tests register a fresh learner per test, which also gives each one the empty progress
  record that a fresh anonymous browser profile used to provide for free.
