# Code review — 2026-08-10

Review of the `dev` branch (9 commits, ~8k lines). All nine findings were verified against
the code and **all nine are fixed**. Test count went 107 → 114.

| #   | Severity | File                                             | Issue                                                         | Status                  |
| --- | -------- | ------------------------------------------------ | ------------------------------------------------------------- | ----------------------- |
| 1   | **HIGH** | `frontend/src/stores/scenarios.ts`               | Debrief never loads — learner sees an empty debrief screen    | fixed + regression test |
| 2   | MEDIUM   | `package.json`                                   | `--env-file-if-exists` needs Node ≥ 22.9, `engines` said ≥ 20 | fixed                   |
| 3   | MEDIUM   | `frontend/src/components/ui/ThemeToggle.vue`     | `aria-label` says the opposite of what the button does        | fixed                   |
| 4   | MEDIUM   | `frontend/src/components/feature/CodeViewer.vue` | Monaco stored in a deep `ref`                                 | fixed                   |
| 5   | LOW      | `backend/.../DrizzleScenarioCatalog.ts`          | Bare `.select()` contradicts the file's own invariant         | fixed                   |
| 6   | LOW      | `backend/src/main.ts`                            | Shutdown handler can skip the pool drain                      | fixed                   |
| 7   | LOW      | `frontend/src/components/feature/HintList.vue`   | Hint text used as list key                                    | fixed                   |
| 8   | LOW      | `frontend/src/views/InvestigateView.vue`         | `activePath` not reset between cases                          | fixed                   |
| 9   | LOW      | `frontend/tsconfig.tsbuildinfo`                  | Build artifact committed                                      | fixed                   |

---

## 1. HIGH — the debrief never loads

**This was a real, user-facing break.** The whole educational payoff of a case was missing.

The router guard calls `scenarios.fetchDetail(scenarioId)` **without** `force`, and
`fetchDetail` early-returns when the scenario is already loaded:

```ts
if (!force && current.value?.id === id) return;
```

The backend only puts `debrief` in the payload once every question is solved. The store only
forced a refetch on `justUnlockedVulnerableLines`, which fires on the **first** question
(both scenarios have `locate` at `orderIndex 0`) — while the quiz is still incomplete.

Sequence that breaks:

1. Open case → payload cached, `debrief: null`
2. Answer Q1 (locate) → forced refetch → `debrief` still `null`, quiz incomplete
3. Answer Q2, Q3 → store updates `state` from the response, **no refetch**
4. Click "Read the debrief" → guard early-returns → `debrief` still `null`
5. `<DebriefPanel v-if="scenario.debrief">` never renders

Root cause, business impact and remediation all invisible until a manual page reload.

**Fix** — invalidate the cached payload when the gate opens, in `answer()`:

```ts
if (result.justUnlockedVulnerableLines || (result.state.quizComplete && !scenario.debrief)) {
  await fetchDetail(scenario.id, true);
}
```

Chosen over forcing on every navigation, which would refetch on each stage change.

**Verified properly:** the new regression test was run against the *un*fixed code and fails,
then passes with the fix restored. A test that has never failed proves nothing.

This bug lived in untested territory — which is why the frontend now has a test setup at all
(`frontend/vitest.config.ts`, 7 store tests).

---

## 2. MEDIUM — Node version floor was wrong

`tsx` forwards `--env-file-if-exists` to Node, and that flag only exists from **Node 22.9**.
The root `package.json` declared `"node": ">=20"`.

A teammate on Node 20 or 21 — explicitly allowed — would get
`node: bad option: --env-file-if-exists` on `npm run dev` instead of a running server.

**Fix:** `engines.node` → `>=22.9`, with a comment saying why. Consistent with what already
ships: `node:22-alpine` is 22.23.2 and CI uses Node 22.

---

## 3. MEDIUM — theme toggle lied to screen readers

The icon and `aria-label` branched on `preference.value === 'dark'`, but `toggle()` resolves
`system` against `prefers-color-scheme`.

On a dark-mode OS, first visit (`preference === 'system'`): the page renders **dark**, the
button shows a **Sun** and announces **"Switch to dark theme"** — and clicking it switches to
**light**. The label states the opposite of what the control does.

**Fix:** `useTheme` now exposes a resolved `isDark` computed, tracking the OS via a
`matchMedia` change listener so `system` stays live. Both the label and the icon use it.

---

## 4. MEDIUM — Monaco in a deep `ref`

`ref()` wraps the editor in a deep reactive Proxy: Vue walks Monaco's large cyclic object
graph on assignment, and Monaco's internal identity checks can be defeated by a proxied
`this`. Typical symptoms are decorations silently not applying, or one-off jank on mount.

**Fix:** `shallowRef`.

---

## 5. LOW — a bare `select()` contradicting its own docblock

`DrizzleScenarioCatalog`'s docblock states that every query selects columns explicitly,
because `select()` with no argument would pull the answer key along with everything else.
`findById` then did exactly that on `scenarios`, loading `root_cause`, `business_impact` and
`remediation` — the gated debrief.

No leak today, since the return object is built field by field. But the guard the comment
described was not actually in place.

**Fix:** explicit column list, with a comment naming the three columns that are deliberately
absent.

---

## 6. LOW — shutdown could skip the pool drain

`server.close(cb)` only fires `cb` once every open connection ends, and nginx holds
keep-alive connections to `api:3000`. On `docker compose down` the callback may not fire
inside Docker's 10s grace period → SIGKILL → the pool drain never runs, which is the exact
connection churn the handler exists to prevent.

**Fix:** `server.closeAllConnections()` after `close()`.

---

## 7. LOW — hint text used as a list key

`:key="hint"` inside a `<TransitionGroup>`. The content schema does not require hints to be
unique, so an author repeating a hint within one question produces duplicate keys and a
broken transition.

**Fix:** `:key="index"` — the list is append-only.

---

## 8. LOW — `activePath` survived between cases

The watcher bailed on `if (!value || activePath.value) return`, so navigating from one case
to another (same route record, different `:id`) kept the previous case's file path,
`activeFile` resolved to `undefined`, and the code pane rendered nothing with no error.

**Fix:** check the path against the **current** scenario's files rather than just checking
that something is selected.

---

## 9. LOW — `tsconfig.tsbuildinfo` committed

`.gitignore` covered `dist/` but not `*.tsbuildinfo`, and `vue-tsc -b` rewrites it on every
build. Beyond diff churn, `tsc -b` trusts this file to decide what to re-check — a stale
committed copy can make a local build **skip typechecking entirely**.

**Fix:** added to `.gitignore`, removed from the index. CI was unaffected (it uses
`vue-tsc --noEmit`).

---

## Not a finding

The committed `frontend/tsconfig.json` change was correct: `paths` without `baseUrl` resolves
relative to the config file's directory, and `vue-tsc --noEmit` passes.

## After

```
114 tests passing (107 backend + 7 frontend)
lint · typecheck · format · build all clean
```
