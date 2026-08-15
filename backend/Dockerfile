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

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/

RUN npm ci --omit=dev --ignore-scripts \
      --workspace=@dd/shared --workspace=@dd/backend --include-workspace-root \
    && npm cache clean --force

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
