# syntax=docker/dockerfile:1.7

# ─── Stage 1 — Build the Vite app ─────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest and build.
COPY . .
RUN npm run build

# ─── Stage 2 — Serve with Nginx ──────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Drop the default config and ship ours (SPA fallback + gzip + cache).
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx already runs PID 1 in the official image; nothing to add.
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
