# syntax=docker/dockerfile:1

# 1) deps: install full dependencies and generate the Prisma client.
#    Reused by the compose `migrate` service to run `prisma migrate deploy`.
FROM node:20-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Copy the Prisma schema before install so the `postinstall` (prisma generate) succeeds.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# 2) builder: compile the Next.js standalone server.
FROM deps AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

# 3) runner: minimal production image, runs as the unprivileged `node` user.
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone output bundles a minimal node_modules (incl. sharp + Prisma client).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Default media root; the compose volume mounts here so uploads persist.
RUN mkdir -p /var/lib/irruptivo/media && chown -R node:node /var/lib/irruptivo

USER node
EXPOSE 3000
CMD ["node", "server.js"]
