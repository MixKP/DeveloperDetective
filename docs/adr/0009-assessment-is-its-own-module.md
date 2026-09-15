# ADR 0009 — The knowledge test is its own module

**Status:** Accepted · 2026-09-14

## Context

The course requires a post-test that measures what a learner takes away from the platform,
and requires the actual results to be collected and reported. The obvious place to put it
was `investigation`, which already owns questions, grading, scoring and every
learner-facing route — [ADR 0001](0001-modular-monolith-with-two-modules.md) folded
`grading`, `progress` and `ethics` into that module for exactly that kind of reason.

The resemblance is superficial. A quiz question inside a case and a post-test question
look alike on screen and are nothing alike underneath:

|             | Investigation quiz              | Knowledge test               |
| ----------- | ------------------------------- | ---------------------------- |
| Belongs to  | one case                        | the learner                  |
| Attempts    | until solved                    | exactly one, ever            |
| Hints       | yes, at a score penalty         | none                         |
| Feedback    | after each answer               | after the whole submission   |
| Score means | how independently you solved it | how much you knew at the end |

A run is also mutated a question at a time, while an attempt is created whole and never
changes again.

## Decision

**`assessment` is a third domain module**, with its own `Attempt` aggregate, its own
`TestScore`, its own ports, and its own routes under `/api/tests`.

Nothing is shared with `investigation` — no table, no transaction, no aggregate. The two
modules meet only in `composition.ts`, and the eslint boundary rules treat `assessment`
like any other module: reaching into its layers from outside is a lint error.

The measurement instrument is deliberately kept separate from the learning activity.
Folding the test into `investigation` would have tied "how much a learner knows" to "how
they performed on one case", and the post-test exists precisely to be a second, independent
reading.

## Consequences

- One more module to wire, and a second seed command (`db:seed` runs both).
- An attempt is per learner, not per case, so the test is rendered on the dashboard rather
  than as a stage of any run — the debrief only points at it. A learner who finishes every
  case still sits the test once.
- Being per learner does not make it available from the first minute: it measures what the
  platform taught, so `Eligibility` keeps it shut until a case is closed. The intent is
  every case, and `CASES_REQUIRED` is set to 1 because the catalog is longer than one
  sitting — raising it tightens the gate with nothing else to change.
- The gate needs a fact `investigation` owns. `assessment` reads it through its own
  `CaseProgress` port, implemented in `composition.ts` from the other module's public API,
  so the two still share no table, no transaction, and no aggregate.
- `test_attempts` carries `unique(learner_id, test_id)`, so the one-sitting rule holds even
  if two tabs submit at the same moment — the aggregate refuses the retake it can see, and
  the constraint refuses the one it cannot.
- Results are exportable from `test_attempts` and `test_responses` without touching
  investigation data, which is what the reporting requirement needs.
