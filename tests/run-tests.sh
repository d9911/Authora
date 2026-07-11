#!/usr/bin/env bash
# Authora testing harness: security audit + k6 load/functional + autocannon bench.
#
#   tests/run-tests.sh audit      # security audit only (boots its own server)
#   tests/run-tests.sh load       # k6 auth + oauth + autocannon (boots a server)
#   tests/run-tests.sh all        # everything
#
# Boots the backend on SQLite :memory: with raised rate limits so load tools
# aren't throttled, then tears it down.
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BE="$ROOT/backend"
PORT="${PORT:-3210}"
BASE="http://127.0.0.1:$PORT"
K6_BIN="$ROOT/tests/bin/k6"
SERVER_PID=""
SERVER_LOG=""

log() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }

ensure_k6() {
  if command -v k6 >/dev/null 2>&1 && k6 version >/dev/null 2>&1; then
    K6_BIN="k6"
    return
  fi
  if [ -x "$K6_BIN" ] && "$K6_BIN" version >/dev/null 2>&1; then return; fi

  echo "k6 is required for load tests but no runnable binary was found." >&2
  case "$(uname -s)" in
    Darwin) echo "Install it with: brew install k6" >&2 ;;
    *) echo "Install it from: https://grafana.com/docs/k6/latest/set-up/install-k6/" >&2 ;;
  esac
  return 1
}

ensure_deps() {
  # node_modules is excluded from snapshots, so (re)install on demand.
  if [ ! -x "$BE/node_modules/.bin/tsc" ]; then
    log "Installing backend dependencies (node_modules missing)"
    (cd "$BE" && yarn install)
  fi
}

build_backend() {
  ensure_deps
  log "Building backend"
  (cd "$BE" && yarn run build)
}

assert_port_free() {
  if PORT_TO_CHECK="$PORT" node -e '
    const net = require("node:net");
    const server = net.createServer();
    server.once("error", () => process.exit(1));
    server.listen(Number(process.env.PORT_TO_CHECK), "127.0.0.1", () => {
      server.close(() => process.exit(0));
    });
  '; then
    return
  fi
  echo "test port $PORT is already in use; choose another with PORT=<port>" >&2
  return 1
}

start_backend() {
  assert_port_free
  log "Starting backend on $BASE (SQLite :memory:, relaxed rate limits)"
  SERVER_LOG="$(mktemp "${TMPDIR:-/tmp}/authora-test-server.XXXXXX")"
  trap stop_backend EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  cd "$BE"
  NODE_ENV=test BACKEND_PORT="$PORT" DB_TYPE=sqlite SQLITE_FILE=:memory: \
    JWT_ACCESS_SECRET=test_access JWT_REFRESH_SECRET=test_refresh \
    SMTP_USER= SMTP_PASS= RATE_LIMIT_MAX=100000 AUTH_RATE_LIMIT_MAX=100000 \
    AUTH_IDENTIFIER_RATE_LIMIT_MAX=100000 \
    node "$ROOT/tests/start-test-backend.mjs" >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  cd "$ROOT"
  for _ in $(seq 1 60); do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      echo "backend process died:"; cat "$SERVER_LOG"; return 1
    fi
    if curl -fs "$BASE/health" >/dev/null 2>&1; then return; fi
    sleep 0.5
  done
  echo "backend failed to start"; cat "$SERVER_LOG"; return 1
}

stop_backend() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill -TERM "$SERVER_PID" 2>/dev/null || true
    for _ in $(seq 1 20); do
      if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
      sleep 0.1
    done
    if kill -0 "$SERVER_PID" 2>/dev/null; then
      kill -KILL "$SERVER_PID" 2>/dev/null || true
    fi
  fi
  if [ -n "$SERVER_PID" ]; then wait "$SERVER_PID" 2>/dev/null || true; fi
  SERVER_PID=""
  if [ -n "$SERVER_LOG" ]; then rm -f "$SERVER_LOG"; fi
  SERVER_LOG=""
}

run_audit() {
  log "Security audit"
  node "$ROOT/tests/security/audit.mjs"
}

run_load() {
  local skip_build="${1:-0}" status=0
  ensure_k6
  if [ "$skip_build" != "1" ]; then build_backend; fi
  start_backend

  log "k6: auth load test"
  BASE_URL="$BASE" "$K6_BIN" run "$ROOT/tests/load/k6-auth.js" || status=1

  log "k6: OAuth functional test"
  BASE_URL="$BASE" "$K6_BIN" run "$ROOT/tests/load/k6-oauth.js" || status=1

  log "autocannon: throughput benchmark"
  BASE_URL="$BASE" node "$ROOT/tests/load/autocannon-bench.mjs" || status=1

  stop_backend
  trap - EXIT INT TERM
  return "$status"
}

case "${1:-all}" in
  audit) build_backend; SECURITY_AUDIT_SKIP_BUILD=1 run_audit ;;
  load) run_load ;;
  all)
    build_backend
    SECURITY_AUDIT_SKIP_BUILD=1 run_audit
    run_load 1
    ;;
  *) echo "usage: $0 {audit|load|all}"; exit 1 ;;
esac

log "Done."
