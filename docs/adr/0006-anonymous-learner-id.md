# ADR 0006 — Anonymous learner id, and why it is not authentication

**Status:** Accepted · 2026-08-10

## Context

`progress` needs a `user_id`, but the proposal never settled on authentication. The options
were real accounts (registration, password hashing, sessions), a display-name prompt, or a
pseudonymous identifier.

Full accounts would consume several days of a five-week term on plumbing the course is not
grading, and would introduce credential handling — the one thing a student project is most
likely to get wrong, in a project about security.

## Decision

A **client-generated UUID** held in `localStorage` and sent as `X-Learner-Id`. The server
validates the format and uses it as the key of the `progress` row.

**This is identity, not authentication.** Anyone presenting a given UUID gets that UUID's
progress. That is acceptable here because:

- the data is quiz scores and hint counts, with no PII attached
- there are no privileged operations behind it — nothing to escalate to
- there is no shared or public listing of learners

It is documented as such in the README, in `learnerId.ts`, and in `api/learnerId.ts` on the
frontend, because the name invites exactly the wrong assumption and a future contributor
might otherwise build authorization on top of it.

## Consequences

- Clearing browser storage loses progress. Acceptable for a learning tool; stated plainly.
- Progress does not follow a learner across devices.
- Week 4 user testing works with zero onboarding friction — no signup step between a
  participant and the thing being tested.
- If real accounts are ever needed, Supabase Auth slots in behind the same `req.learnerId`
  seam without touching a single use case.

## Related

Row Level Security is enabled with no policies on every table (migration `0001`). The API is
the real security boundary — the backend connects with a privileged role — but if the
Supabase anon key ever leaks into a commit or a bundle, the tables are still unreadable.
Defence in depth, five minutes of work.
