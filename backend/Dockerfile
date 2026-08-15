FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY shared shared
COPY backend backend
RUN npm run build -w @dd/shared && npm run build -w @dd/backend

# Editor scanners flag this line with node:22-alpine's own findings (1 critical,
# 7 high — all inside the npm that ships bundled in the base). They read the tag,
# not the image we build: the install layer below deletes npm, and a scan of the
# built image reports zero. No official Node base is cleaner — 24-alpine adds an
# undici finding, the slim variants carry ~24 Debian ones, and distroless trades
# npm's unreachable tar for a libssl3 that is genuinely linked into the runtime.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# npm is a build-time tool. Leaving it in the runtime image ships its whole bundled
# dependency tree — tar, sigstore, brace-expansion and friends — as scanner findings
# for code this container never executes, since the entrypoint is plain `node`.
# Removing it in the same layer that used it keeps it out of the image entirely.
RUN npm ci --omit=dev --ignore-scripts \
  --workspace=@dd/shared --workspace=@dd/backend --include-workspace-root \
  && npm cache clean --force \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
  /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /root/.npm

COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist

# Data the build does not emit: SQL migrations and authored scenario JSON, each
# copied to the path its resolver expects to find beside the compiled module.
COPY backend/src/platform/db/migrations backend/dist/platform/db/migrations
COPY backend/src/modules/catalog/content/scenarios \
  backend/dist/modules/catalog/content/scenarios

USER node

EXPOSE 3000
CMD ["node", "backend/dist/main.js"]
