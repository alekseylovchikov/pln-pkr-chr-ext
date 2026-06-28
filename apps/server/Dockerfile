FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy packages
COPY packages/shared-types ./packages/shared-types

# Copy server
COPY apps/server/package.json ./apps/server/
COPY apps/server/tsconfig.json ./apps/server/

RUN pnpm install --frozen-lockfile

COPY apps/server/src ./apps/server/src

RUN pnpm --filter shared-types build
RUN pnpm --filter server build

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN npm install -g pnpm
RUN apk add --no-cache wget

WORKDIR /app

COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/

RUN pnpm install --prod --frozen-lockfile

RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/poker.db

EXPOSE 3000

CMD ["node", "apps/server/dist/server.js"]
