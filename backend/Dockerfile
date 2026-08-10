# Build context is the repository root, not backend/ — the workspace root package.json and
# the @dd/shared package both have to be visible for npm to resolve the workspace link.
FROM node:22-alpine AS build
WORKDIR /app

# Manifests first: this layer only busts when a dependency changes, not on every source edit.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY shared shared
COPY backend backend
RUN npm run build -w @dd/shared && npm run build -w @dd/backend

# ---------------------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# Only the two workspaces the API actually needs. Without the --workspace filters this
# would also pull Vue and Monaco into the API image for no reason.
RUN npm ci --omit=dev --ignore-scripts \
      --workspace=@dd/shared --workspace=@dd/backend --include-workspace-root \
    && npm cache clean --force

COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist

# tsc emits JavaScript and nothing else, so the SQL migrations and the authored scenario
# JSON have to be copied across explicitly or `db:migrate` and `db:seed` find empty folders.
COPY backend/src/db/migrations backend/dist/db/migrations
COPY backend/src/modules/catalog/infrastructure/seed/scenarios \
     backend/dist/modules/catalog/infrastructure/seed/scenarios

# Drop root before running application code.
USER node

EXPOSE 3000
CMD ["node", "backend/dist/main.js"]
