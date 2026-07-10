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

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BE="$ROOT/backend"
PORT="${PORT:-3210}"
BASE="http://127.0.0.1:$PORT"
K6_BIN="$ROOT/tests/bin/k6"

log() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }

ensure_k6() {
  if command -v k6 >/dev/null 2>&1; then K6_BIN="k6"; return; fi
  if [ -x "$K6_BIN" ]; then return; fi
  log "Downloading k6…"
  local ver="v0.50.0" arch tarball
  case "$(uname -m)" in
    x86_64|amd64) arch="amd64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) echo "unsupported arch"; exit 1 ;;
  esac
  tarball="k6-${ver}-linux-${arch}"
  curl -sL "https://github.com/grafana/k6/releases/download/${ver}/${tarball}.tar.gz" -o /tmp/k6.tgz
  tar xzf /tmp/k6.tgz -C /tmp
  mkdir -p "$ROOT/tests/bin"
  cp "/tmp/${tarball}/k6" "$K6_BIN"
  chmod +x "$K6_BIN"
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

free_port() {
  # kill any stale server on our test port so reruns don't collide
  pkill -f "BACKEND_PORT=$PORT" 2>/dev/null || true
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti ":$PORT" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  fi
}

start_backend() {
  free_port
  log "Starting backend on $BASE (SQLite :memory:, relaxed rate limits)"
  cd "$BE"
  NODE_ENV=test BACKEND_PORT="$PORT" DB_TYPE=sqlite SQLITE_FILE=:memory: \
    JWT_ACCESS_SECRET=test_access JWT_REFRESH_SECRET=test_refresh \
    SMTP_USER= SMTP_PASS= RATE_LIMIT_MAX=100000 AUTH_RATE_LIMIT_MAX=100000 \
    AUTH_IDENTIFIER_RATE_LIMIT_MAX=100000 \
    node dist/app/server.js >/tmp/authora-test-server.log 2>&1 &
  SERVER_PID=$!
  cd "$ROOT"
  echo "$SERVER_PID" > /tmp/authora-test.pid
  for _ in $(seq 1 60); do
    if curl -fs "$BASE/health" >/dev/null 2>&1; then return; fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      echo "backend process died:"; cat /tmp/authora-test-server.log; exit 1
    fi
    sleep 0.5
  done
  echo "backend failed to start"; cat /tmp/authora-test-server.log; exit 1
}

stop_backend() {
  pkill -f "dist/app/server.js" 2>/dev/null || true
}

seed() {
  log "Seeding sample data"
  (cd "$BE" && DB_TYPE=sqlite SQLITE_FILE=:memory: node dist/infrastructure/database/sqlite/seed.js >/dev/null 2>&1 || true)
}

run_audit() {
  log "Security audit"
  node "$ROOT/tests/security/audit.mjs"
}

run_load() {
  ensure_k6
  build_backend
  start_backend
  trap stop_backend EXIT
  # seed countries so public reads have data (same in-memory process via HTTP? no —
  # seed runs a separate process; instead create a country via the API for the bench)
  curl -fs -X POST "$BASE/graphql" -H 'content-type: application/json' \
    -d '{"query":"mutation($i:SignUpInput!){signUp(input:$i){accessToken}}","variables":{"i":{"email":"seed@x.com","password":"password123","name":"S"}}}' >/dev/null || true

  log "k6: auth load test"
  BASE_URL="$BASE" "$K6_BIN" run "$ROOT/tests/load/k6-auth.js" || true

  log "k6: OAuth functional test"
  BASE_URL="$BASE" "$K6_BIN" run "$ROOT/tests/load/k6-oauth.js" || true

  log "autocannon: throughput benchmark"
  BASE_URL="$BASE" node "$ROOT/tests/load/autocannon-bench.mjs" || true

  stop_backend
  trap - EXIT
}

case "${1:-all}" in
  audit) build_backend; run_audit ;;
  load) run_load ;;
  all)
    build_backend
    run_audit
    run_load
    ;;
  *) echo "usage: $0 {audit|load|all}"; exit 1 ;;
esac

log "Done."
