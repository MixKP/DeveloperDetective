# ADR 0004 — The score is derived, never set

**Status:** Accepted · 2026-08-10

## Context

The original brief had the client compute the score (start at 100, subtract per hint and per
wrong attempt) and `POST /api/progress` persist whatever it reported. The v1 plan improved on
this by having the server recompute and _ignore_ a submitted score.

Ignoring is still weaker than it looks: the field exists in the contract, so someone will
eventually read it, and a value that is silently discarded is indistinguishable from one that
is silently honoured.

## Decision

Three layers, none of which rely on discipline:

1. **`Score` has a private constructor and only a `derive(hintsUsed, wrongAttempts)`
   factory.** There is no setter and no public constructor, so no code path anywhere can
   assign a score. Tampering is structurally impossible rather than validated against.
2. **`submitProgressRequestSchema` is `.strict()` and has no `score` field.** A request
   carrying one is **rejected with 400**, not ignored. Failing loudly beats failing quietly.
3. **The scoring rule exists in exactly one place** —
   `investigation/domain/Score.ts`. The v1 plan had the frontend recompute an "optimistic"
   score from a shared module; that is the same rule in two places, which is a DRY violation
   dressed up as code reuse. The API now returns the current score with every answer and hint
   response, and the frontend renders it.

The API also serves the penalty constants (`base`, `hintPenalty`, `wrongAttemptPenalty`,
`floor`) in the scenario payload, so the UI can say _"this hint costs 10 points"_ without
hardcoding — or duplicating — the rule.

## Consequences

- The client cannot display a score before the server responds. In practice every action that
  changes the score is already a request, so there is nothing to show optimistically.
- Changing the scoring rule is a one-line change in one file, and the UI copy follows
  automatically.
- `@dd/shared` stays narrow: HTTP contract only, no business logic. Scoring is a business
  rule and belongs in the domain.
