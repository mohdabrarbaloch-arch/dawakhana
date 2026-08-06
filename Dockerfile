# ── Dawakhana — production image ───────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# better-sqlite3 needs build tools on alpine; use prebuilt binaries where possible
RUN apk add --no-cache python3 make g++

FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS build
COPY package*.json ./
RUN npm ci

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/data

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
