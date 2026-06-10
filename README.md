# Authora — Auth, Profile & Public Locations

Monorepo for a fullstack application with email/password auth, JWT access/refresh,
email confirmation, password recovery, 2FA, GitHub/Telegram auth (post-MVP),
profile editing, and public country/region/city pages.

Two parts:

- **authora-backend** (`./backend`) — Express + GraphQL API
- **authora-frontend** (`./frontend`) — Next.js (FSD) app

> **Current status:** Backend implemented and tested on **MongoDB and SQLite**
> (switchable via `DB_TYPE`). The Next.js frontend is implemented. Postgres
> (Sequelize) is the remaining database to wire in.

## Stack

**Backend**

- Node.js 20 + TypeScript 6
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

# 3a. Option A — SQLite (DEFAULT, no Docker needed). Seed sample locations:
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

- Frontend:          `http://localhost:5178` (sign in at `/sign-in`, `/login` redirects there)
- GraphQL endpoint:  `http://localhost:3010/graphql`
- GraphQL IDE (Ruru): `http://localhost:3010/playground`
- Health check:      `http://localhost:3010/health`

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
make docker-up      # builds & runs backend + frontend (SQLite, no DB container)
make docker-down
```

The default compose stack runs on SQLite, so there are **no dangling service
dependencies**. The frontend waits for the backend's `/health` healthcheck before
starting. To use a server database, start it via its profile and set `DB_TYPE`
(e.g. `make db-mongo-up` then `DB_TYPE=mongo`,
`MONGO_URI=mongodb://mongo:27017/authora`).

Notes on the images:

- Backend uses **`node:22-bookworm-slim`** (glibc) so `better-sqlite3` installs a
  prebuilt binary — no `node-gyp`/Python compilation (the cause of the Alpine
  build failure). Node 22 also satisfies `ruru`'s engine requirement.
- Frontend uses the Next.js **standalone** output for a small runtime image,
  bound to `0.0.0.0:5178`.

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

| `DB_TYPE`  | Driver         | Notes                                                                   |
| ---------- | -------------- | ----------------------------------------------------------------------- |
| `mongo`    | Mongoose       | Set `MONGO_URI`. Seed with `make seed-mongo`.                           |
| `sqlite`   | better-sqlite3 | Set `SQLITE_FILE` (or `:memory:`). `make seed-sqlite`. No Docker needed.|
| `postgres` | Sequelize      | Stubbed — implement the repos to enable.                                |

Both Mongo and SQLite implement the same repository interfaces in
`backend/src/modules/*/domain/*Repository.ts`; they are registered in the single
switch in `backend/src/infrastructure/database/repositories/index.ts`. Adding
Postgres means adding one more set of repository implementations there.

## Roadmap

- [x] Backend base (Express + GraphQL + Clean Architecture)
- [x] Database layer (Mongo + SQLite) + repository abstraction + seed + `DB_TYPE` switch
- [x] User / Profile module
- [x] Email/password auth + JWT access/refresh (rotation)
- [x] Email confirmation + password reset (token flow)
- [x] 2FA (speakeasy + qrcode)
- [x] Frontend (Next.js, FSD, Redux) + PWA
- [x] Docker Compose (backend + frontend)
- [ ] GitHub OAuth
- [ ] Telegram auth (signed Login Widget / bot flow)
- [ ] Postgres (Sequelize) repositories
- [ ] PM2 production setup
```
