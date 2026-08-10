# Developer Detective

A browser-based detective workspace for learning **secure code review and ethical decision
making**. You play the engineer on call: you read an incident brief, explore a simulated
repository in a read-only IDE, report your findings, and then make a professional judgement
call and live with the consequence.

You are always the responsible engineer investigating an incident — never the attacker.

Course project for _Ethics and Professionalism for Software Engineers (953420)_.

---

## Quick start

```bash
cp .env.example .env       # already points at the local stack; nothing to fill in
npm install
npx supabase start         # PostgreSQL, Studio and friends, in Docker
npm run db:migrate         # explicit deploy step, not run on container boot
npm run db:seed            # idempotent; safe to re-run
docker compose up --build
```

The app is then at **http://localhost:8080**, and Supabase Studio at
**http://localhost:54323**.

### Local development without Docker

```bash
npm run dev:api           # http://localhost:3000
npm run dev:web           # http://localhost:5173, proxies /api to :3000
```

`npx supabase stop` when you are done; add `--no-backup` to discard the local data.

---

## The database: two targets

The database never runs as a service in `docker-compose.yml` — no db container there, no
volume to lose, and no healthcheck ordering to get wrong. From the compose file's point of
view the database is simply a host the API dials out to. Which host is the only thing that
changes:

| Target                             | For                                        | Started by       |
| ---------------------------------- | ------------------------------------------ | ---------------- |
| **Local stack** (`supabase start`) | day-to-day development, tests, experiments | the Supabase CLI |
| **Managed project** (supabase.com) | what the team shares, and any demo         | already running  |

Switch by commenting one pair of URLs in `.env` and uncommenting the other. It is the only
switch, so it is worth knowing which one is live before running `db:seed`.

### The local stack

The CLI is a devDependency, so `npm install` is all the setup there is — no `brew`, and
everyone gets the same version.

|          |                                                  |
| -------- | ------------------------------------------------ |
| API      | http://localhost:54321                           |
| Database | `postgresql://postgres:postgres@127.0.0.1:54322` |
| Studio   | http://localhost:54323                           |
| Mailpit  | http://localhost:54324                           |

**The CLI is for `start` and `stop` only.** Do not reach for `supabase db push`, `db diff`
or `link`. Drizzle owns the migrations in this repo and there is no `supabase/migrations/`
directory — those commands would create a second, conflicting source of truth for the schema.

One consequence of the API running in a container: `127.0.0.1` inside that container is the
container itself, not your machine, so compose overrides `DATABASE_URL` with
`DOCKER_DATABASE_URL` (`host.docker.internal`). Leave it set for the local stack, comment it
out for the managed project — unset, it falls through to `DATABASE_URL` unchanged.

### The managed project

Copy both connection strings whole from **Project Settings → Database → Connection string**.
Do not hand-edit the host: the pooler region is part of it, and a stale region fails with
_"Tenant or user not found"_ rather than with anything mentioning regions.

| Variable              | Port | Used by                 | Why                                  |
| --------------------- | ---- | ----------------------- | ------------------------------------ |
| `DATABASE_URL`        | 6543 | the running API         | Transaction pooler                   |
| `DIRECT_DATABASE_URL` | 5432 | `db:migrate`, `db:seed` | DDL needs a session-level connection |

Three things that will bite you if you skip them:

1. **`prepare: false` is mandatory** on the pooled connection and is pinned in
   `platform/db/client.ts`. The pooler is PgBouncer in transaction mode, which hands a
   different backend connection to each statement — prepared statements do not survive that.
   Leave it on and the app works locally and then fails in the container with an opaque
   _"prepared statement does not exist"_.
2. **Migrations must use the direct URL.** The pooler cannot run DDL reliably.
3. **The dashboard's "direct connection" host (`db.<ref>.supabase.co`) is IPv6-only.** On an
   IPv4-only network it is simply unreachable, which is why `DIRECT_DATABASE_URL` above is
   the session pooler on port 5432 instead.

The free tier **pauses a project after about a week of inactivity**. Check the dashboard the
day before any demo.

Deploying a schema change is `npm run db:migrate` with `.env` pointed at the managed project
— the same command, a different target. `db:seed` upserts by natural key, so re-running it
against shared data updates the content without invalidating anyone's progress.

---

## Architecture

A **modular monolith** with Clean Architecture applied where it earns its place.

```
Browser (Vue 3 SPA)
   │  X-Learner-Id
   ▼
Nginx ── static SPA + reverse proxy /api → api:3000
   ▼
Express API
   ├─ interface        controllers · Zod · error mapping
   ├─ application      use cases · ports
   ├─ domain           the Investigation aggregate, and every business rule
   └─ infrastructure   Drizzle repositories · schema · seed
   ▼
Supabase PostgreSQL
```

Two domain modules, not five:

- **`catalog`** — scenario content, and custodian of the answer key. No HTTP routes.
- **`investigation`** — the learner's run: grading, hints, scoring, reveal, the ethical
  decision. Owns every learner-facing endpoint, because every one of them is gated by run
  state.

`grading`, `progress` and `ethics` were folded into `investigation` because they mutate the
same aggregate in the same operation. Splitting them would mean a distributed transaction
inside a monolith.

### The boundaries are lint errors, not documentation

`eslint.config.mjs` fails the build when:

- `domain/` imports Express, Drizzle, Postgres or `@dd/shared`
- `domain/` or `application/` import an outward layer
- one module reaches past another's public `index.ts`
- a `.vue` component contains a raw hex colour instead of a design token

---

## Security properties

Three things this project is careful about, since it would be an awkward artifact otherwise.

**The answer key never reaches the browser.** Not by remembering to strip a field — by
dependency inversion. The `AnswerKey` port answers _verdicts_, and has no
`getCorrectOption()` and no `getAllHints()` to call. `DrizzleAnswerKey` is the only file in
the codebase that names `correct_option`. Gated content is never even _loaded_ unless its
rule already said yes:

| Content                   | Released when                                 |
| ------------------------- | --------------------------------------------- |
| vulnerable line numbers   | a `locate` question is answered correctly     |
| an explanation            | that question is answered correctly           |
| hint text                 | the learner has paid the score penalty for it |
| the debrief               | every question is solved                      |
| ethical quality + outcome | the learner has committed to a choice         |

`tests/api/answer-key.contract.test.ts` fails the build if any of it leaks, by field name
_and_ by value.

**The score cannot be set, only derived.** `Score` has a private constructor and only a
`derive()` factory, so no code path exists that assigns one. `POST /api/progress` has no
`score` field and its schema is `.strict()`, so a client-supplied score is **rejected**
rather than silently ignored.

**`X-Learner-Id` is identity, not authentication.** It is a client-generated UUID in
`localStorage` — a pseudonymous progress key. Anyone presenting a UUID gets that UUID's quiz
scores. That is acceptable because the data carries no PII and there are no privileged
operations behind it. **Do not build auth on top of it.** Supabase Auth would slot in behind
the same `req.learnerId` seam without touching a use case.

Row Level Security is enabled with no policies on every table (migration `0001`). The API is
the real boundary, but if the Supabase anon key ever leaks the tables are still unreadable.

---

## Scoring

`max(20, 100 − 10 × hints − 15 × wrong attempts)`

Defined once, in `investigation/domain/Score.ts`. The frontend never recomputes it — the API
returns the current score with every answer and hint, and serves the penalty values so the UI
can say _"this hint costs 10 points"_ without hardcoding the rule.

---

## Scenario content

Authored as JSON in `backend/src/modules/catalog/infrastructure/seed/scenarios/`, validated
by Zod at import **and** in CI (`tests/content/`), so a broken scenario fails in milliseconds
rather than during a demo. The schema enforces the rules that are easy to get wrong: a
`correctOption` that matches no option, a `vulnerableLines` entry past the end of the file,
or a scenario with no `locate` question — which would leave line highlighting permanently
locked.

The seed upserts by natural key rather than wiping and reinserting, so row ids stay stable
and existing learner progress survives a reseed.

Two scenarios ship: **SQL injection authentication bypass** (Critical) and **a live payment
key committed to a public repository** (High).

---

## Commands

| Command                    | Does                                                                        |
| -------------------------- | --------------------------------------------------------------------------- |
| `npm test`                 | 114 tests — domain, application, API, content, stores. No database required |
| `npm run test:integration` | 21 tests — Drizzle repositories and the seed against real PostgreSQL        |
| `npm run test:e2e`         | 7 tests — the full journey in a real browser (Playwright)                   |
| `npm run test:all`         | All three levels                                                            |
| `npm run typecheck`        | All three workspaces                                                        |
| `npm run lint`             | Includes the architecture boundary rules                                    |
| `npm run format`           | Prettier                                                                    |
| `npm run db:generate`      | Regenerate migrations after a schema change                                 |
| `npm run db:migrate`       | Apply migrations (direct connection)                                        |
| `npm run db:seed`          | Import scenario JSON (idempotent)                                           |
| `npx supabase start`       | Start the local Supabase stack                                              |
| `npx supabase stop`        | Stop it (`--no-backup` to discard the local data)                           |

The domain and application suites run with no network access at all, which is the point of
keeping the domain framework-free.

### The four levels, and what each one is for

| Level                       | Runs against      | Catches                                                                           |
| --------------------------- | ----------------- | --------------------------------------------------------------------------------- |
| **Unit** (domain, stores)   | nothing           | Business rules: scoring, hint progression, the reveal gate                        |
| **API** (supertest + fakes) | in-memory fakes   | Validation, error mapping, and the answer-key contract                            |
| **Integration**             | a real PostgreSQL | Wrong SQL, jsonb that does not round-trip, upserts that conflict on the wrong key |
| **End-to-end**              | a real browser    | The seams: router guards, store caching, Monaco layout                            |

Integration and e2e need a database — the local stack, not the shared one:

```bash
npx supabase start
npm run db:migrate && npm run db:seed
npm run test:integration    # creates and drops its own dd_test database
npm run test:e2e            # starts the API and the SPA itself
```

The integration suite creates and drops databases, which is reason enough not to point it at
the managed project.

Each level earns its place. The e2e suite found a progression deadlock that every layer
below it reported as healthy: the router guard treated the run's reported stage as a
permission, so a learner who had read the code but not yet answered anything was refused
the quiz — the only place they could go to make progress.

---

## Verifying it works

```bash
curl localhost:3000/api/health
# {"status":"ok","db":"ok"}

# The answer key must not appear. This should print nothing.
curl -s -H 'X-Learner-Id: 3f9f1a3e-6a4e-4f2b-9c3d-1a2b3c4d5e6f' \
  localhost:3000/api/scenarios/1 | grep -Ei 'correctOption|"hints"'

# A submitted score is rejected, not ignored.
curl -s -X POST -H 'Content-Type: application/json' \
  -H 'X-Learner-Id: 3f9f1a3e-6a4e-4f2b-9c3d-1a2b3c4d5e6f' \
  -d '{"scenarioId":1,"completed":true,"score":100}' \
  localhost:3000/api/progress
# {"error":{"code":"VALIDATION_ERROR", ...}}
```

Then walk the flow in the browser: dashboard → brief → investigate → quiz (take a hint, miss
once) → debrief → ethical choice. The score should read **75**.

---

## Team

|                           |                                           |
| ------------------------- | ----------------------------------------- |
| Jirapat Sereerat          | Use case authoring & systems design       |
| Thanatchanan Kanjina      | Frontend                                  |
| Peeranat Thiwongsa        | Backend API, database, use case authoring |
| Supawit Promma            | QA testing & Docker deployment            |
| Aphichaya Suppakitkumjorn | Frontend                                  |

Work is split **by module rather than by layer** — with five people, slicing by layer means
everyone edits the same files every day.
