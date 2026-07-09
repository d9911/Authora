# Auth env diagnostics

Date: 2026-07-09

This document records the auth integration diagnostics for email, GitHub OAuth,
and Telegram bot auth/linking. Secret values are not stored here. Statuses use
only `SET` / `MISSING`, lengths, and safe observations such as `contains ellipsis`.

## Commands used

- `find . -maxdepth 3 -name '.env*' -print`
- safe Node `.env` parser: reports `SET` / `MISSING`, value length, and placeholder flags only
- `docker compose --profile mongo -f docker-compose.yml -f docker-compose.mongo.yml config --format json` piped into a sanitizer
- `docker compose --profile mongo -f docker-compose.yml -f docker-compose.mongo.yml exec -T backend node -e ...` for sanitized runtime env checks
- `docker compose --profile mongo -f docker-compose.yml -f docker-compose.mongo.yml logs --no-color --tail=300 backend` piped into a sanitizer
- backend-container smoke checks for:
  - `/api/auth/github` redirect metadata
  - `telegramBotStart`
  - Telegram `getMe`
  - SMTP `verify()`

## Env files found

| File | Status | Notes |
|---|---|---|
| `.env` | FOUND | Root Compose env. Before the fix it contained placeholder-shaped auth values with ellipsis. |
| `backend/.env` | FOUND | Local backend env. It contains non-placeholder-shaped SMTP, GitHub, and Telegram values by length/shape checks. |
| `backend/.env.docker` | MISSING | Optional Docker-only override file. |
| `frontend/.env` | FOUND | Local/build-time frontend env. |
| `frontend/.env.local` | MISSING | Not used in the current checkout. |
| `.env.example` | FOUND | Updated to placeholders only. |
| `backend/.env.example` | FOUND | Updated to placeholders only. |
| `backend/.env.docker.example` | FOUND | Updated to placeholders only. |
| `frontend/.env.example` | FOUND | Updated to match current frontend env usage. |

## Env sourcing map

### Local backend

Source in code: `backend/src/config/env.ts`.

The backend calls `dotenv.config({ path: path.resolve(process.cwd(), '.env') })`.
When started through `make backend-dev` or `make dev`, the Makefile changes into
`backend/`, so `process.cwd()` is `backend/` and the backend reads `backend/.env`.

### Local frontend

Source in code: `frontend/src/shared/config/index.ts`.

Next reads frontend env files from the frontend project directory. Current code
uses:

- `BACKEND_INTERNAL_URL`
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_APP_NAME`

`NEXT_PUBLIC_TELEGRAM_BOT` was present in examples, but current Telegram bot
deep-link auth does not read it.

### Docker backend

Source in Compose: `docker-compose.yml`.

Before the fix, Compose loaded root `.env` and optional `backend/.env.docker`.
Because `backend/.env.docker` was missing, the backend container received the
placeholder-shaped root `.env` values.

After the fix, Compose loads backend env in this order:

1. `.env`
2. `backend/.env`
3. `backend/.env.docker`

Docker-only DB and URL values remain in `environment`, so they override any
host-only values from env files.

Sanitized resolved config after the fix:

| Variable | Resolved status |
|---|---|
| `SMTP_PASS` | SET, len 20, no ellipsis |
| `GITHUB_CLIENT_ID` | SET, len 20, no ellipsis |
| `GITHUB_CLIENT_SECRET` | SET, len 40, no ellipsis |
| `TELEGRAM_BOT_TOKEN` | SET, len 46, no ellipsis |
| `TELEGRAM_BOT_URL` | SET, len 24, no ellipsis |

### Docker frontend

Source in Compose: `docker-compose.yml`.

The frontend container runtime receives `BACKEND_INTERNAL_URL=http://backend:3010`.
Public `NEXT_PUBLIC_*` values are build-time values in Next.js, so they are not
necessarily visible in `docker compose exec frontend printenv` after the
standalone build.

## Email diagnostics

Code path:

1. `frontend/src/features/SignUpForm/SignUpForm.tsx`
2. `frontend/src/features/auth-api/authApi.ts`
3. GraphQL mutation `signUp`
4. `backend/src/app/graphql/resolvers.ts`
5. `backend/src/modules/auth/use-cases/AuthUseCases.ts`
6. `backend/src/infrastructure/mail/MailService.ts`

Mail env read by code:

- `OWNER_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

Confirmed runtime failure before the fix:

- backend Docker env had `SMTP_PASS` SET with len 8 and `contains_ellipsis`.
- SMTP `verify()` failed with Mail.ru `535` and the message that an application
  password is required.
- backend logs showed `[mail] send failed, falling back to console`, so the API
  could report success even when the email was not delivered by SMTP.

Root cause:

Docker backend was using placeholder SMTP credentials from root `.env`, not the
real local backend credentials from `backend/.env`.

Fix:

- Compose now loads `backend/.env` after root `.env`.
- `MailService` no longer swallows SMTP send failures when SMTP is configured.
  It logs the provider error and returns a GraphQL `MAIL_SEND_FAILED` error.
- Console fallback remains only for the explicit dev case where SMTP credentials
  are not configured.

## GitHub OAuth diagnostics

Code path:

1. `frontend/src/features/GithubLoginButton/GithubLoginButton.tsx`
2. `backend/src/app/oauthRoutes.ts` route `GET /api/auth/github`
3. `backend/src/modules/auth/oauth/GithubOAuthService.ts`
4. GitHub callback `GET /api/auth/github/callback`
5. `frontend/src/app/oauth/complete/OAuthComplete.tsx`
6. GraphQL mutation `oauthExchange`

GitHub env read by code:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`
- frontend browser URL: `NEXT_PUBLIC_BACKEND_URL`
- frontend server URL: `BACKEND_INTERNAL_URL`

Confirmed runtime failure before the fix:

- backend Docker env had `GITHUB_CLIENT_ID` len 9 with ellipsis.
- backend Docker env had `GITHUB_CLIENT_SECRET` len 11 with ellipsis.
- smoke test of `/api/auth/github` returned a GitHub authorize redirect whose
  `client_id` contained ellipsis.

Root cause:

Docker backend was generating the GitHub authorize URL from placeholder GitHub
OAuth values in root `.env`.

Additional flow issue:

Email/password sign-in already preserved `?next=...`, but GitHub OAuth success
always ended at `/profile/edit`. This made successful OAuth look like it went to
an unexpected route when the user originally tried to open another protected page.

Fix:

- Compose now loads `backend/.env` for real GitHub OAuth values.
- GitHub state now carries a GitHub-specific safe `next` path.
- `/oauth/complete` redirects to that safe `next` path after handoff exchange.
- GitHub remains separate from Telegram; it does not use Telegram popup/ticket logic.

## Telegram diagnostics

Code path:

1. `frontend/src/features/TelegramLoginButton/TelegramLoginButton.tsx`
2. GraphQL mutation `telegramBotStart`
3. `backend/src/app/graphql/resolvers.ts`
4. `backend/src/modules/auth/oauth/TelegramBotService.ts`
5. `backend/src/modules/auth/use-cases/AuthUseCases.ts`
6. GraphQL mutation `telegramBotPoll`

Telegram env read by code:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_URL`

Confirmed runtime failure before the fix:

- backend Docker env had `TELEGRAM_BOT_TOKEN` len 7 with ellipsis.
- token shape check failed.
- Telegram `getMe` returned HTTP 404 with `Not Found`.
- backend logs showed `[telegram-bot] getUpdates issue: Not Found`.
- `telegramBotStart` returned a token but empty `botUrl`, so the frontend showed
  `Telegram bot is not configured on the server.`

Root cause:

Docker backend was using placeholder Telegram bot token from root `.env`. The
server had a `TELEGRAM_BOT_URL`, but that alone did not prove the bot token was
valid. `getMe` failed, so the server could not safely create a bot deep-link.

Fix:

- Compose now loads `backend/.env` after root `.env`.
- `TelegramBotService` validates token shape before `getMe`.
- `telegramBotStart` now throws provider-specific
  `AUTH_PROVIDER_NOT_CONFIGURED` when the bot URL cannot be resolved, instead of
  returning an empty URL and making the frontend infer a generic error.
- Telegram remains a separate GraphQL ticket/poll flow and does not share
  GitHub OAuth state.

## What could not be confirmed

- Actual delivery to a mailbox was not confirmed by sending a real message during
  this diagnostic pass. SMTP authentication was checked with `verify()`.
- GitHub App settings in GitHub's UI were not checked from this environment, so
  callback URL registration in GitHub itself must still be verified manually.

## Post-fix verification snapshot

After `make doc-mongo` rebuilt and recreated the Docker stack:

| Check | Result |
|---|---|
| `docker compose ps` | backend `healthy`, frontend `started`, mongo `healthy` |
| backend Docker env | `SMTP_PASS` len 20 no ellipsis; `GITHUB_CLIENT_ID` len 20 no ellipsis; `GITHUB_CLIENT_SECRET` len 40 no ellipsis; `TELEGRAM_BOT_TOKEN` len 46 no ellipsis |
| SMTP `verify()` | `ok` |
| GitHub start redirect | HTTP 302 to `github.com/login/oauth/authorize`; `client_id` len 20 no ellipsis; state contains safe `next` |
| Telegram `getMe` | HTTP 200, `ok=true`, bot username present |
| `telegramBotStart` | HTTP 200, no GraphQL errors, `botUrl` contains `?start=` |
| backend logs | Telegram long-poll started; deep-link base resolved; no new `getUpdates issue` in the checked tail |
