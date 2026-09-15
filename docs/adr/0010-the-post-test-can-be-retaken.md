# ADR 0010 — The post-test is retaken against a different draw

**Status:** Accepted · 2026-09-15 · amends [ADR 0009](0009-assessment-is-its-own-module.md)

## Context

ADR 0009 made the post-test a single sitting, never retaken, and the schema enforced it
with `unique(learner_id, test_id)`. That is the right rule for an instrument whose only
job is to measure, and the wrong one for this platform: the test is also the last piece
of teaching a learner gets, and a result they cannot act on is a grade rather than a
lesson.

Simply allowing a retake of the same ten questions would have measured whether the
learner remembered the feedback, which is neither a measurement nor a lesson. And an
attempt that reports "6 out of 10" without saying which of the eight principles the four
wrong answers turned on leaves the learner to do the diagnosis themselves.

## Decision

**A learner may sit the post-test as often as they like, and each sitting is a different
draw from a larger bank.**

- The bank holds **three questions per principle** (24). One sitting asks
  `questionsPerAttempt` of them — 10, the length the course brief asks for. The draw gives
  every principle one question before any principle gets a second, so the ten always cover
  the whole Code, and which two principles are asked twice varies by sitting.
- `QuestionDraw` spends **unseen questions first**, so the second and third sittings share
  no question with the first. Once the bank is exhausted, sittings repeat rather than
  shrink.
- The draw and the option order are a **pure function of (learner, test, attempt number)**.
  A reload therefore re-deals the identical sitting, and `SubmitAttempt` can re-derive what
  it handed out — so answers to questions this sitting did not ask are refused, and no draw
  has to be stored between the two requests.
- Options are shuffled per learner and per sitting, so "the answer was the second one" is
  not carried between attempts.
- Each sitting is graded into an `AttemptReview`: a verdict, the **principles missed**
  grouped together with the guidance authored for each, and the principles that held.
- `test_attempts` is keyed by `unique(learner_id, test_id, attempt_number)`. Sittings are
  numbered rather than unique.

## Consequences

- Reporting changes shape: a learner has a _history_, not a result. The API returns every
  sitting (`history`), and the improvement between sittings is itself a finding the course
  can report on.
- Authoring cost is real. Every principle now needs enough questions for a retake to
  differ, and guidance to answer a wrong answer with; `tests/content/` fails the build if a
  principle has fewer than two questions or no guidance.
- A learner determined to farm the bank can eventually see every question. That is an
  accepted trade: this is a teaching instrument on a learning platform, not an exam under
  invigilation, and the honest alternative — one sitting, no feedback to act on — teaches
  less.
- The one-sitting property that ADR 0009 relied on for reporting is replaced by "one row
  per sitting". Two tabs submitting the same draw still collide on the unique constraint,
  and the repository turns that into the same rule violation the aggregate would have
  raised.
