# syntax=docker/dockerfile:1.7
# ABG Dispatch API. Build context: the abg-dispatch/ folder (see docker-compose.yml).
#
# No OS packages are installed, so the build works without apt mirrors:
# the full Node image already has OpenSSL 3 (Prisma's engines need it), and
# the slim runtime receives just the openssl binary and its two libraries.
#
# Behind a TLS-inspecting corporate proxy, pass its CA without baking it into
# the image:  docker build --secret id=extra_ca,src=/path/to/ca.pem …
ARG NODE_BUILD_IMAGE=node:22-bookworm
ARG NODE_RUNTIME_IMAGE=node:22-bookworm-slim

FROM ${NODE_BUILD_IMAGE} AS build
ARG BUN_VERSION=1.4.2
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm install -g "bun@${BUN_VERSION}" && bun --version
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    bun install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    bun run --filter @abg-dispatch/shared build \
 && cd apps/api \
 && bunx prisma generate \
 && bun run build
RUN mkdir -p /opt/openssl/lib \
 && cp "$(command -v openssl)" /opt/openssl/ \
 && cp /usr/lib/*-linux-gnu/libssl.so.3 /usr/lib/*-linux-gnu/libcrypto.so.3 /opt/openssl/lib/ \
 && cp "$(readlink -f "$(command -v bun)")" /opt/bun

FROM ${NODE_RUNTIME_IMAGE} AS runtime
COPY --from=build /opt/openssl/openssl /usr/local/bin/openssl
COPY --from=build /opt/openssl/lib/ /usr/local/lib/
# bun runs the seed script: docker compose exec api bun prisma/seed.ts
COPY --from=build /opt/bun /usr/local/bin/bun
RUN ldconfig && openssl version
ENV NODE_ENV=production \
    PORT=18491 \
    STORAGE_DIR=/data/storage
WORKDIR /app
COPY --from=build --chown=node:node /app /app
# Attachments live on a mounted volume, never inside the image.
RUN mkdir -p /data/storage && chown -R node:node /data
USER node
WORKDIR /app/apps/api
EXPOSE 18491
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||18491)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Apply pending migrations (append-only ledger triggers included), then serve.
CMD ["sh", "-c", "bun x prisma migrate deploy && exec node dist/main.js"]
