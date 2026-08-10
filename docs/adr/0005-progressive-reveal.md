# ADR 0005 — Progressive reveal, enforced server-side

**Status:** Accepted · 2026-08-10

## Context

The brief asked for a file tree that flags vulnerable files with a warning icon and a code
viewer that highlights the vulnerable lines. Both would be visible from the moment the
learner opens the case — which hands over the answer to the `locate` question before they
have read a line of code. The investigation becomes a formality.

## Decision

**Reveal is progressive, and the gate lives in the domain.**

- The file tree marks files as **recently changed** — an honest lead pointing at the deploy
  under investigation, not a "the bug is here" flag.
- Vulnerable line numbers are served as `[]` until the learner answers a `locate` question
  correctly. The check is `Investigation.canRevealVulnerableLines()`, and the API simply does
  not fetch the line numbers when it returns false.
- The debrief (root cause, business impact, remediation) is `null` until every question is
  solved. It is the answer in prose.
- An ethical choice's `quality` and `outcome` are absent from the payload until the learner
  commits to a choice. Sending them early would label the "right" answer.
- Monaco's TypeScript validation is switched off. The scenarios contain deliberately broken
  code, and red squiggles would point at the defect before the learner found it.

The unlock is **stored on the run** rather than recomputed from the catalog, so investigation
never has to ask another module about question kinds after the fact.

## Consequences

- A learner who opens devtools sees nothing useful, because the gating happens before
  serialization rather than in the Vue layer.
- The route guard in `router/index.ts` mirrors the stage machine for UX only. The API is the
  enforcement; the guard just avoids showing an empty page.
- The content schema requires every scenario to have at least one `locate` question. Without
  one, line highlighting could never unlock — a failure that would otherwise surface only
  when a learner was halfway through the case.
