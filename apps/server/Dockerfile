# Build context: monorepo root
FROM node:20-alpine

RUN apk add --no-cache python3 make g++ wget
RUN npm install -g pnpm

WORKDIR /app

# Manifests first — maximise layer cache
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/server/package.json ./apps/server/

# Install all deps (including devDeps needed to build + native better-sqlite3)
RUN pnpm install --frozen-lockfile

# Source
COPY packages/shared-types ./packages/shared-types
COPY apps/server/src ./apps/server/src
COPY apps/server/tsconfig.json ./apps/server/

# Build shared-types first, then server
RUN pnpm --filter @planning-poker/shared-types build
RUN pnpm --filter server build

RUN mkdir -p /data

ENV NODE_ENV=production
ENV DB_PATH=/data/poker.db

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "apps/server/dist/server.js"]
