#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if docker info >/dev/null 2>&1; then
  compose="docker compose"
else
  sock="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/podman/podman.sock"
  if [ ! -S "$sock" ]; then
    systemctl --user start podman.socket
  fi
  if ! podman info >/dev/null 2>&1; then
    echo "Docker Desktop is not running, and Podman did not start." >&2
    exit 1
  fi
  compose="podman compose"
fi
# shellcheck disable=SC2086
exec $compose up -d --build --wait
