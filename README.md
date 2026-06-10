# Fullstack App "Authora"— Auth, Profile & Public Locations

Monorepo for a fullstack application with email/password auth, JWT access/refresh,
email confirmation, password recovery, 2FA, GitHub/Telegram auth (post-MVP),
profile editing, and public country/region/city pages.

> **Current status:** Backend implemented and tested on **MongoDB and SQLite**
> (switchable via `DB_TYPE`), with **Swagger/OpenAPI docs** at `/docs`. The
> Next.js frontend is implemented; Postgres (Sequelize) is the remaining DB.

## Stack (backend MVP)

- Node.js 20 + TypeScript
- Express + GraphQL (`graphql-http` + `@graphql-tools/schema`)
- Clean Architecture + Feature Modules (domain / use-cases / infrastructure / graphql)
- MongoDB via Mongoose **and** SQLite via better-sqlite3, switchable through
  `DB_TYPE` behind shared repository interfaces (Postgres/Sequelize plugs in next)
- JWT access/refresh (rotation + hashed refresh tokens in DB)
- bcrypt password hashing
- speakeasy + qrcode for 2FA
- nodemailer (console fallback when SMTP is not configured)
- Swagger UI / OpenAPI 3 docs at `/docs` (spec at `/swagger.json`)

## Project layout

```
project-root/
  backend/            # Express + GraphQL API (this MVP)
    src/
      app/            # server, express, container, graphql (schema/resolvers/context)
      config/         # env
      core/           # errors catalog
      modules/        # auth, user, profile, location (domain + use-cases)
      infrastructure/ # mongo + sqlite repos, jwt, mail, repository factory
      shared/swagger/ # OpenAPI aggregator (+ per-module swagger.ts files)
    smoke-test.ts        # end-to-end test against in-memory Mongo
    smoke-test-sqlite.ts # end-to-end test against in-memory SQLite + Swagger
  docker-compose.yml  # mongo (profile), postgres (profile), backend
  Makefile            # install / dev / build / docker / seed / test
```

## Quick start (local)

```bash
# 1. Install backend deps
make install

# 2. Configure env
cp backend/.env.example backend/.env
# (defaults work; set MONGO_URI to a running MongoDB)

# 3a. Option A — MongoDB (Docker) and seed sample locations
make db-mongo-up
make seed-mongo

# 3b. Option B — SQLite (no Docker needed). Set DB_TYPE=sqlite in backend/.env
make seed-sqlite

# 4. Run the backend in dev mode
make backend-dev
```

- GraphQL endpoint: `http://localhost:3010/graphql`
- GraphQL IDE (Ruru): `http://localhost:3010/playground`
- Swagger UI:        `http://localhost:3010/docs` (spec: `/swagger.json`)
- Health check:      `http://localhost:3010/health`

## Run the test suite

Each smoke test boots an **in-memory database**, so they need no external services:

```bash
make backend-test          # MongoDB (in-memory)
make backend-test-sqlite   # SQLite (in-memory) + Swagger checks
```

They exercise: sign up, duplicate-email rejection, `me`, sign in (good/bad password),
refresh-token rotation + reuse rejection, profile update + auth guard, full 2FA
enroll → confirm → 2FA-gated login, nested location queries, and password-reset request.
The SQLite suite additionally verifies `/swagger.json` and the `/docs` UI.

## Example GraphQL

```graphql
mutation {
  signUp(input: { email: "a@b.com", password: "password123", name: "Alice" }) {
    accessToken
    refreshToken
    needTwoFactor
    user { id email emailVerified }
  }
}

query {
  countries { id name regions { name cities { name } } }
}
```

Send the `accessToken` as `Authorization: Bearer <token>` for protected operations
(`me`, `myProfile`, `updateProfile`, `enableTwoFactor`, `changePassword`, ...).

## Switching databases

`DB_TYPE` in `backend/.env` selects the implementation — no business-logic changes:

| `DB_TYPE` | Driver            | Notes                                            |
| --------- | ----------------- | ------------------------------------------------ |
| `mongo`   | Mongoose          | Set `MONGO_URI`. Seed with `make seed-mongo`.    |
| `sqlite`  | better-sqlite3    | Set `SQLITE_FILE` (or `:memory:`). `make seed-sqlite`. No Docker needed. |
| `postgres`| Sequelize         | Stubbed — implement the repos to enable.         |

Both Mongo and SQLite implement the same repository interfaces in
`backend/src/modules/*/domain/*Repository.ts`; they are registered in the single
switch in `backend/src/infrastructure/database/repositories/index.ts`. Adding
Postgres means adding one more set of repository implementations there.

## API documentation (Swagger)

Interactive OpenAPI 3 docs are served at **`/docs`** (raw spec at `/swagger.json`).
Because the API is GraphQL-first, the docs expose the single `POST /graphql`
operation with a dropdown of ready-to-run examples for every query/mutation, plus
reusable component schemas (`User`, `Profile`, `Country`, `AuthPayload`, the
`ApiErrorCode` enum, …). Per-module definitions live in
`backend/src/modules/*/swagger.ts` and are aggregated by
`backend/src/shared/swagger/index.ts`.

## Roadmap (per the plan)

- [x] Backend base (Express + GraphQL + Clean Architecture)
- [x] Database layer (Mongo) + repository abstraction + seed
- [x] User / Profile module
- [x] Email/password auth + JWT access/refresh (rotation)
- [x] Email confirmation + password reset (token flow)
- [x] 2FA (speakeasy + qrcode)
- [x] SQLite repositories (better-sqlite3) + seed + DB_TYPE switch
- [x] Swagger / OpenAPI docs (`/docs`, `/swagger.json`)
- [x] Frontend (Next.js, FSD, Redux) + PWA
- [ ] GitHub OAuth
- [ ] Telegram auth (signed Login Widget / bot flow)
- [ ] Postgres (Sequelize) repositories
- [ ] PM2 production + full Docker Compose (frontend)
```
