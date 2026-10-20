# syntax=docker/dockerfile:1.7
# ABG Dispatch admin portal: static build served by nginx, which also proxies /api.
# Build context: the abg-dispatch/ folder (see docker-compose.yml).
ARG NODE_IMAGE=node:22-bookworm-slim
ARG NGINX_IMAGE=nginx:1.27-alpine

FROM ${NODE_IMAGE} AS build
ARG BUN_VERSION=1.4.2
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    npm install -g "bun@${BUN_VERSION}"
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    bun install --frozen-lockfile --ignore-scripts
COPY packages/shared packages/shared
COPY apps/admin apps/admin
RUN bun run --filter @abg-dispatch/shared build && cd apps/admin && bun run build

FROM ${NGINX_IMAGE}
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
# nginx runs unprivileged: every file must be world-readable whatever the build host's umask.
RUN chmod -R u=rwX,go=rX /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
