FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY shared shared
COPY frontend frontend

# Vite inlines these at build time, so they arrive as build args rather than
# runtime env. Leaving them empty produces an anonymous-only bundle.
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""

ENV VITE_API_BASE_URL=/api \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build -w @dd/shared && npm run build -w @dd/frontend

FROM nginx:1.29-alpine AS runtime

# The base image lags Alpine's package index, so patched openssl/curl/expat land
# here before the next nginx tag ships them. Costs a layer; removes the CVE backlog.
RUN apk --no-cache upgrade

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
