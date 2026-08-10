# ADR 0002 — The answer key is protected by a port, not by a serializer

**Status:** Accepted · 2026-08-10

## Context

The product's core security property is that the browser never receives the answer key:
correct options, unrevealed hints, unrevealed explanations, vulnerable line numbers, the
debrief, or the quality of an ethical choice.

The obvious implementation is "load the question, strip the secret fields before sending".
That works right up until someone adds an endpoint, writes a debug route, or spreads an
object one layer further out than they meant to. It relies on every future developer
remembering, which is not a security control.

An application that teaches secure code review while shipping its own answer key to the
browser would be a poor artifact to submit.

## Decision

`catalog` exposes an `AnswerKey` port that returns **verdicts, not secrets**:

```ts
checkAnswer(questionId, optionId): Promise<{ correct, explanation, kind } | null>
hintAt(questionId, index): Promise<string | null>
```

There is no `getCorrectOption()` and no `getAllHints()`. The `investigation` module — which
grades, scores and serializes — therefore cannot obtain the correct option **even in process
memory**, because no method returns it.

`DrizzleAnswerKey` is the only file in the codebase that names `correct_option`,
`hints`, `vulnerable_lines`, `ethical_choices.quality` or the debrief columns. Every other
query selects columns explicitly, so a bare `select()` cannot quietly pull a secret along.

Gated content is never _loaded_ unless its rule already said yes, so there is no
sanitization step to forget.

## Consequences

- The protection survives refactors: a new endpoint cannot leak what it cannot reach.
- Dependency inversion here is doing security work rather than architectural decoration,
  which is the clearest justification for a port anywhere in this codebase.
- `tests/api/answer-key.contract.test.ts` deep-scans serialized payloads by field name _and_
  by value, so a leak that renamed a field still fails the build.
- Slightly more chatter between modules: rebuilding a scenario view makes one call per
  question for revealed hints. At two scenarios this is irrelevant, and it is the honest
  cost of not passing secrets around in bulk.
