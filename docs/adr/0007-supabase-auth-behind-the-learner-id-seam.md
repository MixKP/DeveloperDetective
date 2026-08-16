# ADR 0007 — Supabase Auth behind the learner-id seam

**Status:** Superseded in part by [ADR 0008](0008-accounts-are-required.md), which makes signing in required · Accepted 2026-08-16

## Context

ADR 0006 chose a client-generated UUID over real accounts, and said plainly that if
accounts were ever needed, "Supabase Auth slots in behind the same `req.learnerId` seam
without touching a single use case." Accounts are now wanted: progress that does not
follow a learner between devices, and vanishes when browser storage is cleared, is a real
limitation for a tool people are asked to work through over several sittings.

The alternative — writing registration, password hashing, and session handling by hand —
was rejected for the reason ADR 0006 already gave: credential handling is the thing a
student project is most likely to get wrong, in a project about getting security right.
Supabase is already the Postgres host, so its auth costs no new vendor.

## Decision

`requireLearner` accepts **either** identity and produces the same `req.learnerId`:

1. `Authorization: Bearer <supabase access token>` — verified, and the token's `sub`
   (a UUID, matching what `progress.user_id` already stores) becomes the learner id.
2. `X-Learner-Id: <uuid>` — the anonymous identifier from ADR 0006, unchanged.

Token verification is local, via `jose`: HS256 against `SUPABASE_JWT_SECRET` for projects
on the legacy shared secret, or the project JWKS for asymmetric signing keys. No network
round-trip to Supabase per request, which matters on serverless where every invocation is
cold. `req.authenticated` records which path was taken, for anything that later needs to
care.

Both credentials are optional. With neither configured the API is anonymous-only and
rejects bearer tokens outright rather than trusting them; the frontend correspondingly
hides its sign-in UI when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are absent.

## Consequences

- No use case, repository, or table changed. The seam held.
- A signed-in learner's progress follows them across devices — the first consequence
  ADR 0006 listed as a cost is now opt-in to avoid.
- Anonymous access stays, so week 4 user testing keeps its zero-onboarding path and the
  e2e suite needs no accounts.
- Anonymous progress does **not** migrate into an account on sign-up. A learner who works
  anonymously and then registers starts fresh. Claiming the anonymous UUID on sign-up
  would mean trusting a client-supplied id to attach history to a real account — the
  wrong trade in a project about security. Stated in the UI instead.
- Signing in or out swaps the learner id, so the frontend clears loaded scenario state
  and returns to the dashboard rather than showing the previous identity's progress.
- The anon key ships in the frontend bundle. That is what it is for; RLS with no policies
  (migration `0001`) is why a leak is still not a read of the tables.

## Related

- [ADR 0006](0006-anonymous-learner-id.md) — the seam this builds on.
