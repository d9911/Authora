# Authora — testing harness

Three complementary tools to validate **security**, **functionality** and
**performance** of the API (incl. the GitHub/Telegram auth & linking flows).

| Tool                      | What it checks                                                                                                         | File                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Security audit** (Node) | OWASP-style checks: auth gating, JWT tampering, token leakage, injection, CSRF/signature, CORS, rate-limiting, headers | `security/audit.mjs`                  |
| **k6** (Grafana)          | Functional + load: auth lifecycle under load, OAuth/bot flows                                                          | `load/k6-auth.js`, `load/k6-oauth.js` |
| **autocannon** (Node)     | Raw HTTP throughput benchmark                                                                                          | `load/autocannon-bench.mjs`           |

## Run

```bash
make check-source       # fast source-level regression checks (no server)
make check-types        # backend + frontend TypeScript checks
make check              # check-source + check-types
make security-audit     # boots its own in-memory server, runs 22 checks
make load-test          # k6 (auth + oauth) + autocannon (boots a server)
make test-all           # everything

# or directly:
node tests/check-source.mjs
node tests/security/audit.mjs
tests/run-tests.sh load
```

`run-tests.sh` is **fully self-contained** — it will, on demand:

- `npm install` the backend if `node_modules` is missing,
- `npm run build`,
- download **k6** to `tests/bin/k6` (no system install needed),
- install **autocannon** (`--no-save`),
- boot the backend on SQLite `:memory:` with **relaxed rate limits**
  (`RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX`) so the load tools aren't throttled,
- free the test port on rerun and tear the server down at the end.

So a clean checkout can run `make test-all` with nothing pre-installed.
Tune load with env: `VUS=20 DURATION=30s make load-test`.

## What "good" looks like

- **Security audit:** `RESULT: 22 passed, 0 failed` (exit 0). Any `high`/`critical`
  failure exits non-zero.
- **k6 auth:** `checks 100%`, `http_req_failed 0%`, `public_reads p(95) < 300ms`.
  Sign-up latency is intentionally **bcrypt-bound** (~0.6s) — measured under its
  own `signup_duration` threshold, not the fast-path budget.
- **k6 oauth:** all 13 checks pass — GitHub redirect/CSRF, Telegram signature
  rejection, bot ticket lifecycle, link-auth gating.
- **autocannon:** ~700+ req/s on the authenticated `me` hot path, 0 non-2xx.

## Security controls verified / added

The audit drove these hardening additions (`backend/src/shared/middlewares/security.ts`):

- **Rate limiting** — general (`300/min`) + strict auth limiter (`10/min`) on
  credential mutations → brute-force returns `429`.
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, CSP, `X-Powered-By` removed.
- **Body limit** — oversized payloads return `413` (not `500`).

Already-present controls confirmed by the audit: refresh-token rotation &
reuse-rejection, purpose-scoped tokens (access≠refresh≠oauth), no password /
2FA-secret leakage, GraphQL type-safety blocking NoSQL operator injection,
non-enumerable login & password-reset, Telegram HMAC signature check, GitHub
OAuth CSRF `state`, CORS allow-list.

```

```
