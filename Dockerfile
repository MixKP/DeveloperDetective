# One file, two images. Both services descend from a single `deps` stage, so the
# workspace install happens once per build instead of once per Dockerfile — and the
# API's production tree is pruned out of that same install rather than fetched again.
#
#   docker compose build          builds both targets
#   docker build --target api .   builds just the API image
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# npm runs `prepare` after `npm ci`, and the script has to exist to decide it has
# nothing to do here — the sources it would compile arrive in the stages below.
COPY scripts scripts
RUN npm ci

# The contract package both sides compile against.
FROM deps AS shared-build
COPY shared shared
RUN npm run build -w @dd/shared

FROM shared-build AS api-build
COPY backend backend
RUN npm run build -w @dd/backend

# Schema and content, applied once against whatever database compose points at.
# It runs the same `db:migrate` and `db:seed` a developer runs by hand, from the
# same sources, on the build tree that already has tsx — so `docker compose up` on
# a fresh clone produces a database with the scenarios and the test bank in it.
# Local convenience only: this stage is never pushed and never serves traffic.
FROM api-build AS migrator
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed"]

FROM shared-build AS web-build
COPY frontend frontend

# Vite inlines these at build time, so they arrive as build args rather than
# runtime env. Leaving them empty produces an anonymous-only bundle.
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""

ENV VITE_API_BASE_URL=/api \
  VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build -w @dd/frontend

# The production tree, resolved independently of the build so BuildKit runs the two
# concurrently. `npm prune --omit=dev` looks like the cheaper move, but in a workspace
# it leaves the other packages' dependencies hoisted at the root behind — it grew this
# image from 288MB to 486MB, typescript included.
#
# What lands here is 14 MB. The three lines below are why; each was worth 10-25 MB.
FROM node:22-alpine AS api-runtime-deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
# frontend/package.json is deliberately absent. npm resolves the peers of every
# workspace it can see, and `vue` and `pinia` declare `typescript` as an optional
# peer — copying it in put 23 MB of compiler into a runtime image that only ever
# runs `node`. `npm ci` is happy to install a subset of the lockfile's workspaces.
#
# --omit=peer for the same reason, one level down: nothing the API loads at runtime
# needs a peer of its own (drizzle-orm declares two dozen drivers, all optional).
# Type declarations and source maps go last: node never reads either, and they are
# two thirds of drizzle-orm.
RUN npm ci --omit=dev --omit=optional --omit=peer --ignore-scripts \
  --workspace=@dd/shared --workspace=@dd/backend --include-workspace-root \
  && npm cache clean --force \
  && find node_modules -type f \
    \( -name '*.d.ts' -o -name '*.d.cts' -o -name '*.d.mts' -o -name '*.map' \) -delete

# Editor scanners flag this line with node:22-alpine's own findings (1 critical,
# 7 high — all inside the npm that ships bundled in the base). They read the tag,
# not the image we build: the two layers below delete npm and patch the base
# packages, and a scan of the built image reports zero. No official Node base is
# cleaner — 24-alpine adds an undici finding, the slim variants carry ~24 Debian
# ones, and distroless trades npm's unreachable tar for a libssl3 that is genuinely
# linked into the runtime.
FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production

# Same reason as the web stage: the base image lags Alpine's package index, so
# patched openssl lands here before the next node tag ships it. Node bundles its own
# OpenSSL and does not link libcrypto3, so the finding is unreachable from the app —
# but it is still in the image, and an unreachable CVE still has to be answered for.
ARG APK_SNAPSHOT=dev
RUN echo "apk snapshot $APK_SNAPSHOT" && apk --no-cache upgrade

# npm is a build-time tool. Leaving it in the runtime image ships its whole bundled
# dependency tree — tar, sigstore, brace-expansion and friends — as scanner findings
# for code this container never executes, since the entrypoint is plain `node`.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
  /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /root/.npm

COPY package.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY --from=api-runtime-deps /app/node_modules node_modules
COPY --from=api-build /app/shared/dist shared/dist
COPY --from=api-build /app/backend/dist backend/dist

# Data the build does not emit: SQL migrations and authored content JSON, each
# copied to the path its resolver expects to find beside the compiled module.
COPY backend/src/platform/db/migrations backend/dist/platform/db/migrations
COPY backend/src/modules/catalog/content/scenarios \
  backend/dist/modules/catalog/content/scenarios
COPY backend/src/modules/assessment/content/tests \
  backend/dist/modules/assessment/content/tests

USER node

EXPOSE 3000
CMD ["node", "backend/dist/main.js"]

FROM nginx:1.29-alpine AS web

# The base image lags Alpine's package index, so patched openssl/curl/expat land
# here before the next nginx tag ships them. Costs a layer; removes the CVE backlog.
#
# `apk --no-cache` is about apk's index cache, not Docker's layer cache, and this
# command's text never changes — so a cached layer keeps reporting success while the
# Alpine index moves on, and a CVE that was patched reappears in an image the
# Dockerfile still claims to patch. That is not hypothetical: it is how
# CVE-2026-14456 came back here. APK_SNAPSHOT is passed per build so this one layer
# is rebuilt, and the expensive stages above it are not.
ARG APK_SNAPSHOT=dev
RUN echo "apk snapshot $APK_SNAPSHOT" && apk --no-cache upgrade

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
