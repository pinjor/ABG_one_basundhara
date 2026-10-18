FROM oven/bun:1.4.0
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN bun install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN bun run --filter @bsc/shared build \
  && cd apps/api \
  && bunx prisma generate \
  && bun run build \
  && chmod +x docker-entrypoint.sh

ENV PORT=4000
EXPOSE 4000
ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
