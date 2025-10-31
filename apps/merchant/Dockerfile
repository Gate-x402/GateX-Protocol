FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/merchant ./apps/merchant
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @gatex/common db:generate
RUN pnpm --filter @gatex/merchant build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/merchant/dist ./dist
COPY --from=builder /app/apps/merchant/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/common/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/index.js"]

