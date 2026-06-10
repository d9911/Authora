# Fullstack App "Authora"— Auth, Profile & Public Locations

Monorepo for a fullstack application with email/password auth, JWT access/refresh,
email confirmation, password recovery, 2FA, GitHub/Telegram auth (post-MVP),
profile editing, and public country/region/city pages.

> **Current status:** Backend MVP is implemented and tested (MongoDB).
> Frontend and the Postgres/SQLite repository implementations come in later stages.

## Stack (backend MVP)

- Node.js 20 + TypeScript
- Express + GraphQL (`graphql-http` + `@graphql-tools/schema`)
- Clean Architecture + Feature Modules (domain / use-cases / infrastructure / graphql)
- MongoDB via Mongoose (Postgres/SQLite plug in behind the same repository interfaces)
- JWT access/refresh (rotation + hashed refresh tokens in DB)
- bcrypt password hashing
- speakeasy + qrcode for 2FA
- nodemailer (console fallback when SMTP is not configured)

## Project layout

```
project-root/
  backend/            # Express + GraphQL API (this MVP)
    src/
      app/            # server, express, container, graphql (schema/resolvers/context)
      config/         # env
      core/           # errors catalog
      modules/        # auth, user, profile, location (domain + use-cases)
      infrastructure/ # mongo models/repos, jwt, mail, repository factory
    smoke-test.ts     # end-to-end test against in-memory Mongo
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

# 3. Start MongoDB (Docker) and seed sample locations
make db-mongo-up
make seed

# 4. Run the backend in dev mode
make backend-dev
```

- GraphQL endpoint: `http://localhost:3010/graphql`
- GraphQL IDE (Ruru): `http://localhost:3010/playground`
- Health check: `http://localhost:3010/health`

## Run the test suite

The smoke test spins up an **in-memory MongoDB**, so it needs no external services:

```bash
make backend-test
```

It exercises: sign up, duplicate-email rejection, `me`, sign in (good/bad password),
refresh-token rotation + reuse rejection, profile update + auth guard, full 2FA
enroll → confirm → 2FA-gated login, nested location queries, and password-reset request.

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

`DB_TYPE` in `backend/.env` selects the implementation. The MVP ships `mongo`.
Adding Postgres/SQLite means implementing the repository interfaces in
`backend/src/modules/*/domain/*Repository.ts` and registering them in
`backend/src/infrastructure/database/repositories/index.ts` — no use-case changes.

## Roadmap (per the plan)

- [x] Backend base (Express + GraphQL + Clean Architecture)
- [x] Database layer (Mongo) + repository abstraction + seed
- [x] User / Profile module
- [x] Email/password auth + JWT access/refresh (rotation)
- [x] Email confirmation + password reset (token flow)
- [x] 2FA (speakeasy + qrcode)
- [ ] GitHub OAuth
- [ ] Telegram auth (signed Login Widget / bot flow)
- [ ] Postgres (Sequelize) + SQLite repositories
- [ ] Frontend (Next.js, FSD, Redux) + PWA
- [ ] PM2 production + full Docker Compose (frontend)
```
