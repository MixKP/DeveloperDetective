# ADR 0001 — A modular monolith with two domain modules, not five

**Status:** Accepted · 2026-08-10

## Context

The brief proposed five backend modules: `scenario`, `investigation`, `grading`, `progress`
and `ethics`. Splitting by domain concept is the right instinct, but the concepts have to be
separable in practice, not just nameable.

Looking at what each would own:

- **`grading`** mutates run state in the same operation it grades. A wrong answer increments
  `wrongAttempts`; a correct `locate` answer unlocks line highlighting. Both belong to the
  investigation aggregate.
- **`progress`** _is_ the persisted investigation run. `GET /api/progress` is a read model
  over it, not a separate thing.
- **`ethics`** is one table, a three-value enum, and a single write that also closes the case
  — roughly thirty lines of logic.

## Decision

Two domain modules — **`catalog`** (scenario content, custodian of the answer key) and
**`investigation`** (the learner's run) — plus a non-domain `platform` layer for env, the DB
client, HTTP wiring and error mapping.

Clean Architecture layering is applied **in full only inside `investigation`**, where the
business rules actually live. `catalog` has read models and no entities, because reference
data with no invariants does not need a rich domain model.

## Consequences

- One user action stays inside one aggregate and one transaction. The five-module split
  would have needed either a distributed transaction inside a monolith or an
  eventual-consistency bug.
- The architecture diagram looks less impressive than five boxes would. That is the honest
  trade: the code has two things in it because there are two things.
- The layering is deliberately asymmetric, which reads as inconsistent until you notice it
  tracks where the rules are.

## When to split further

Documented so this is a decision rather than an excuse:

- an authoring or admin UI for scenarios → split `authoring` out of `catalog`
- per-question analytics or adaptive difficulty → `grading` becomes real
- instructor accounts and classrooms → split `identity`
