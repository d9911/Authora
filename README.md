# Authora — Auth, Profile & Public Locations

Monorepo for a fullstack application with email/password auth, JWT access/refresh,
email confirmation, email/Telegram account recovery, 2FA, GitHub/Telegram auth,
profile editing, and public country/region/city pages.

Two parts:

- **authora-backend** (`./backend`) — Express + GraphQL API
- **authora-frontend** (`./frontend`) — Next.js (FSD) app

> **Current status:** Backend implemented and tested on **MongoDB and SQLite**
> (switchable via `DB_TYPE`). The Next.js frontend is implemented. Postgres
> (Sequelize) is the remaining database to wire in.

## Stack

**Backend**

- Node.js 24 + TypeScript 6/7
- Express 5 + GraphQL (`graphql-http` + `@graphql-tools/schema`)
- Clean Architecture + Feature Modules (domain / use-cases / infrastructure / graphql)
- MongoDB via Mongoose **and** SQLite via better-sqlite3, switchable through
  `DB_TYPE` behind shared repository interfaces (Postgres/Sequelize plugs in next)
- JWT access/refresh (rotation + hashed refresh tokens in DB)
- bcrypt password hashing
- speakeasy + qrcode for 2FA
- nodemailer (console fallback when SMTP is not configured)

> API exploration is built in via GraphQL: open the **Ruru** IDE at `/playground`
> (full schema introspection + try-it-out). No separate Swagger layer is needed.

**Frontend**

- Next.js (App Router) + TypeScript, Feature-Sliced Design
- Redux Toolkit + Redux Thunk, Axios, Sass, PWA
- Same-origin `/api/graphql` proxy (hides backend URL, httpOnly JWT cookies)

## Project layout

```
project-root/
  backend/            # authora-backend — Express + GraphQL API
    src/
      app/            # server, express, container, graphql (schema/resolvers/context)
      config/         # env
      core/           # errors catalog
      modules/        # auth, user, profile, location (domain + use-cases)
      infrastructure/ # mongo + sqlite repos, jwt, mail, repository factory
    smoke-test.ts        # end-to-end test against in-memory Mongo
    smoke-test-sqlite.ts # end-to-end test against in-memory SQLite
  frontend/           # authora-frontend — Next.js app (FSD)
  docker-compose.yml  # backend + frontend (SQLite by default); mongo/postgres profiles
  Makefile            # install / dev / build / docker / seed / test
```

## Quick start (local)

```bash
# 1. Install deps (backend + frontend)
make install

# 2. Configure env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3a. Option A — SQLite (DEFAULT, no Docker needed). Seed locations + users:
make seed-sqlite

# 3b. Option B — MongoDB: set DB_TYPE=mongo in backend/.env, then:
make db-mongo-up
make seed-mongo

# 4. Run BOTH backend + frontend together (Ctrl-C stops both)
make dev

#   …or run them separately:
make backend-dev      # http://localhost:3010
make frontend-dev     # http://localhost:5178
```

- Frontend: `http://localhost:5178` (sign in at `/sign-in`, `/login` redirects there)
- GraphQL endpoint: `http://localhost:3010/graphql`
- GraphQL IDE (Ruru): `http://localhost:3010/playground`
- Health check: `http://localhost:3010/health`

## Run the test suite

Each smoke test boots an **in-memory database**, so they need no external services:

```bash
make backend-test          # MongoDB (in-memory)
make backend-test-sqlite   # SQLite (in-memory)
```

They exercise: sign up, duplicate-email rejection, `me`, sign in (good/bad password),
refresh-token rotation + reuse rejection, profile update + auth guard, full 2FA
enroll → confirm → 2FA-gated login, nested location queries, and password-reset request.

## Docker

```bash
# SQLite stack (default — no DB container)
make docker-up        # builds & runs backend + frontend on SQLite
make docker-seed      # seed countries/regions/cities into the running container
make docker-down

# MongoDB stack (starts mongo, points backend at it, waits & seeds)
make db-mongo-up
```

The default compose stack runs on SQLite, so there are **no dangling service
dependencies**. The frontend waits for the backend's `/health` healthcheck
before starting.

DB configuration is set with **literal values** in compose `environment`, and the
container does **not** load `backend/.env` (that file is for local `make dev` and
its `DB_TYPE=mongo` / `MONGO_URI=127.0.0.1` would be wrong inside a container).
This guarantees `make docker-up` always runs on SQLite and never tries to reach
`127.0.0.1:27017`. The MongoDB stack is wired via a compose override
(`docker-compose.mongo.yml`) that flips `DB_TYPE=mongo`,
`MONGO_URI=mongodb://mongo:27017/authora` and adds `depends_on: mongo (healthy)`.

Docker secrets (SMTP / OAuth / Telegram) can come from the root **`.env`** that
Compose reads, or from **`backend/.env.docker`** (copy from
`backend/.env.docker.example`) for Docker-only overrides — never DB settings.

Notes on the images:

- Backend uses **`node:24-bookworm-slim`** (glibc) with `python3/make/g++` in the
  build stage so the native `better-sqlite3` always compiles for the current Node
  ABI (the cause of the earlier unhealthy container). The compiled `node_modules`
  is copied into the runtime stage — no rebuild at runtime.
- Frontend uses **`node:24-alpine`** with the Next.js **standalone** output, bound
  to `0.0.0.0:5178` (also `next dev/start -H 0.0.0.0` so it's reachable outside
  the container).
- `mongo` has its own healthcheck; the backend also retries the Mongo connection
  on startup so transient `ECONNREFUSED` during boot won't crash it.
- The optional Ruru `/playground` is loaded lazily inside a `try/catch`, so a
  missing/incompatible dev dependency can never crash the server at startup.
- Backend uses `restart: on-failure:3` (not `unless-stopped`) so a crashing
  container isn't silently recreated with a new id mid-`depends_on` wait — that
  is what produced the confusing `No such container` / `dependency failed to
start` message.

### Debugging a container that won't become healthy

```bash
docker compose logs backend          # see the actual startup error
docker compose ps                    # check status / health
docker compose exec backend node -e "require('http').get('http://127.0.0.1:3010/health',r=>console.log(r.statusCode))"
```

## Example GraphQL

```graphql
mutation {
  signUp(input: { email: "a@b.com", password: "password123", name: "Alice" }) {
    accessToken
    refreshToken
    needTwoFactor
    user {
      id
      email
      emailVerified
    }
  }
}

query {
  countries {
    id
    name
    regions {
      name
      cities {
        name
      }
    }
  }
}
```

Send the `accessToken` as `Authorization: Bearer <token>` for protected operations
(`me`, `myProfile`, `updateProfile`, `enableTwoFactor`, `changePassword`, ...).

## Switching databases

`DB_TYPE` in `backend/.env` selects the implementation — no business-logic changes:

| `DB_TYPE`  | Driver         | Notes                                                                    |
| ---------- | -------------- | ------------------------------------------------------------------------ |
| `mongo`    | Mongoose       | Set `MONGO_URI`. Seed with `make seed-mongo`.                            |
| `sqlite`   | better-sqlite3 | Set `SQLITE_FILE` (or `:memory:`). `make seed-sqlite`. No Docker needed. |
| `postgres` | Sequelize      | Stubbed — implement the repos to enable.                                 |

### Seeded accounts

The seed (`make seed-sqlite` / `make seed-mongo`) inserts 6 countries → regions →
cities and these users (shared dataset in `backend/src/infrastructure/database/seed-data.ts`):

| Email               | Password      | Notes                                                   |
| ------------------- | ------------- | ------------------------------------------------------- |
| `d.99113@gmail.com` | `d9911`       | **Key/owner account.** Email verified, **2FA enabled**. |
| `alice@example.com` | `password123` | Verified                                                |
| `bob@example.com`   | `password123` | Verified                                                |
| `carol@example.com` | `password123` | Unverified                                              |

The key user's 2FA secret comes from the token `c3516442d42c4bb599b58e5ead567afa`
(hex), stored as base32 `YNIWIQWUFRF3LGNVRZPK2VT27I`. Add that secret manually in
Google Authenticator / Authy (or scan a QR built from it) to get working codes;
sign-in returns `needTwoFactor`, then `signInTwoFactor` with the 6-digit code.

Both Mongo and SQLite implement the same repository interfaces in
`backend/src/modules/*/domain/*Repository.ts`; they are registered in the single
switch in `backend/src/infrastructure/database/repositories/index.ts`. Adding
Postgres means adding one more set of repository implementations there.

## Roadmap

- [x] Backend base (Express + GraphQL + Clean Architecture)
- [x] Database layer (Mongo + SQLite) + repository abstraction + seed + `DB_TYPE` switch
- [x] User / Profile module
- [x] Email/password auth + JWT access/refresh (rotation)
- [x] Email/Telegram account recovery (one-time grant + session revocation)
- [x] 2FA (speakeasy + qrcode)
- [x] Frontend (Next.js, FSD, Redux) + PWA
- [x] Docker Compose (backend + frontend)
- [x] GitHub OAuth (login + account linking, cross-origin handoff)
- [x] Telegram auth (bot deep-link flow, login + linking)
- [x] Security audit + load testing (k6 / autocannon) + hardening
- [ ] Postgres (Sequelize) repositories
- [ ] PM2 production setup

## Testing, security & load

A dedicated harness lives in [`tests/`](tests/README.md):

```bash
make security-audit   # 22 OWASP-style checks (auth gating, JWT tampering,
                      # token leakage, injection, CSRF/signature, CORS, headers,
                      # brute-force rate-limiting)
make load-test        # k6 functional+load (auth & GitHub/Telegram flows) +
                      # autocannon throughput benchmark
make test-all
make check                 # source contracts + typechecks + recovery behavior
make backend-test-sqlite   # local GraphQL recovery smoke, no external DB
```

Latest local results: **security 25/25**, **k6 auth checks 100% / 0 failed**,
**k6 oauth 13/13**, **autocannon ~700 req/s** on the authed hot path.
Hardening added from the audit (rate limiting, security headers, 413 on oversized
bodies) lives in `backend/src/shared/middlewares/security.ts`.

## Social login & account linking (GitHub / Telegram)

Both providers support **login** (sign in / auto-create) AND **linking** to an
already-authenticated account (Profile → _Connected accounts_).

**Why the handoff:** OAuth redirects to the backend origin, but sessions live in
httpOnly cookies on the _frontend_ origin. So after a successful OAuth login the
backend issues a one-time **handoff token** and redirects to
`/oauth/complete?handoff=…`; that page calls `oauthExchange` through the
same-origin proxy, which sets the cookies on the frontend. This works in Docker
where the two run on different hosts.

**GitHub linking:** an authenticated user mints a short-lived `oauthLinkToken`,
the GitHub flow starts with `?link=<token>`, and the callback attaches the
provider to the current account instead of logging in.

**Telegram = bot deep-link flow** (works on localhost — no HTTPS widget domain
needed):

1. Click _Continue with Telegram_ → `telegramBotStart` creates a one-time
   ticket and returns `https://t.me/<bot>?start=<ticket>`, opened in a new tab.
2. The user taps **Start**; Telegram delivers `/start <ticket>` to the bot,
   which the backend long-polls (`getUpdates`) and resolves with the
   Telegram-verified user (the bot token authenticates the identity).
3. The frontend polls `telegramBotPoll`; on `done` it logs in (tokens → cookies
   via the proxy), on `linked` it attaches Telegram to the current user.

`unlinkProvider` removes a provider (refusing to leave a passwordless account
with no way to sign in).

Required env:

```
# backend local dev: backend/.env
# Docker: root .env and/or backend/.env.docker
GITHUB_CLIENT_ID=...        GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:3010/api/auth/github/callback
TELEGRAM_BOT_TOKEN=8460081839:...           # from BotFather
TELEGRAM_BOT_URL=https://t.me/AuthAuraBot   # bot deep-link base

# frontend (.env) — browser-facing
NEXT_PUBLIC_BACKEND_URL=http://localhost:3010   # full-page GitHub redirect
```

The GitHub OAuth App **Authorization callback URL** must match
`GITHUB_CALLBACK_URL` for the active environment. Docker passes
`NEXT_PUBLIC_BACKEND_URL` into the frontend build, so changing a public OAuth URL
requires a frontend rebuild. See `docs/github-oauth-user-action.md` for the
public deployment contract and the temporary HTTP staging restriction.

## 📄 LICENSE

[LICENSE](./LICENSE)
