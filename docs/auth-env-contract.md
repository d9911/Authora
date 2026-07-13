# Auth env contract

Date: 2026-07-10

Secret values must never be committed to docs. Use placeholders in example files
and keep real values in local `.env`, `backend/.env`, or `backend/.env.docker`.

| Provider | Variable | Required for | Runtime | Source file | Status | Notes |
|---|---|---|---|---|---|---|
| Email | `OWNER_EMAIL` | fallback sender / owner identity | backend local, backend Docker | `backend/src/config/env.ts` | SET in `.env`, SET in `backend/.env` | Not a password. |
| Email | `SMTP_HOST` | SMTP transport host | backend local, backend Docker | `backend/src/config/env.ts`, `MailService.ts` | SET in `.env`, SET in `backend/.env` | Example uses placeholder. |
| Email | `SMTP_PORT` | SMTP transport port | backend local, backend Docker | `backend/src/config/env.ts`, `MailService.ts` | SET in `.env`, SET in `backend/.env` | `465` uses secure transport; `587` usually uses STARTTLS. |
| Email | `SMTP_USER` | SMTP authentication | backend local, backend Docker | `backend/src/config/env.ts`, `MailService.ts` | SET in `.env`, SET in `backend/.env` | Leave empty only for console-log dev mode. |
| Email | `SMTP_PASS` | SMTP authentication | backend local, backend Docker | `backend/src/config/env.ts`, `MailService.ts` | root `.env` placeholder before fix; `backend/.env` SET len 20 | Mail.ru requires an application password. |
| Email | `EMAIL_FROM` | not used | none | none | MISSING | Current code sends from `SMTP_USER || OWNER_EMAIL`. |
| GitHub | `GITHUB_CLIENT_ID` | GitHub authorize URL | backend local, backend Docker | `backend/src/config/env.ts`, `GithubOAuthService.ts` | root `.env` placeholder before fix; `backend/.env` SET len 20 | Must match the GitHub OAuth App. |
| GitHub | `GITHUB_CLIENT_SECRET` | code-to-token exchange | backend local, backend Docker | `backend/src/config/env.ts`, `GithubOAuthService.ts` | root `.env` placeholder before fix; `backend/.env` SET len 40 | Backend-only secret. Never expose to frontend. |
| GitHub | `GITHUB_CALLBACK_URL` | GitHub OAuth callback | backend local, backend Docker | `backend/src/config/env.ts`, `GithubOAuthService.ts`, `docker-compose.yml` | SET | Compose default is localhost; deployments override it through root `.env`. |
| Telegram | `TELEGRAM_BOT_TOKEN` | `getMe`, `getUpdates`, bot messages | backend local, backend Docker | `backend/src/config/env.ts`, `TelegramBotService.ts` | root `.env` placeholder before fix; `backend/.env` SET len 46 | Must match Telegram token shape and pass `getMe`. |
| Telegram | `TELEGRAM_BOT_URL` | bot deep-link base | backend local, backend Docker | `backend/src/config/env.ts`, `TelegramBotService.ts` | SET | Does not prove the token works; `getMe` is still required. |
| Telegram | `TELEGRAM_BOT_USERNAME` | not used | none | none | MISSING | Current bot flow derives username through `getMe` or uses `TELEGRAM_BOT_URL`. |
| Frontend public URLs | `NEXT_PUBLIC_BACKEND_URL` | browser redirect to backend OAuth routes | frontend build | `frontend/src/shared/config/index.ts`, `frontend/Dockerfile`, `docker-compose.yml` | SET | Build-time public value; rebuild frontend after changing it. |
| Frontend public URLs | `NEXT_PUBLIC_APP_NAME` | app display name | frontend build | `frontend/src/shared/config/index.ts`, `next.config.mjs` | SET in example/config | Safe to expose. |
| Frontend server URLs | `BACKEND_INTERNAL_URL` | Next server proxy to backend GraphQL | frontend local, frontend Docker | `frontend/src/shared/config/index.ts`, `docker-compose.yml` | SET | Docker runtime uses `http://backend:3010`. |
| Backend public URLs | `FRONTEND_URL` | email links and backend OAuth redirects to frontend | backend local, backend Docker | `backend/src/config/env.ts`, `oauthRoutes.ts`, `MailService.ts` | SET | Compose default is localhost; deployments override it through root `.env`. |
| Backend public URLs | `CORS_ORIGINS` | backend CORS allowlist | backend local, backend Docker | `backend/src/config/env.ts` | SET | Comma-separated list. |
| Cookies | `COOKIE_SECURE` | httpOnly cookie Secure flag | backend and frontend proxy | `backend/src/config/env.ts`, `frontend/src/shared/api/requestHandler.ts` | SET | Keep `false` on plain localhost. |
| Transport | `ALLOW_INSECURE_PUBLIC_HTTP` | explicit staging-only public HTTP opt-in | backend Docker | `backend/src/config/env.ts`, `docker-compose.yml` | OPTIONAL | Default `false`; never use when HTTPS is available. |
| Docker-only config | `DB_TYPE` | repository selection | backend Docker | `docker-compose.yml`, `docker-compose.mongo.yml` | SET by Compose | Mongo profile forces `mongo`. |
| Docker-only config | `MONGO_URI` | Mongo connection | backend Docker | `docker-compose.yml`, `docker-compose.mongo.yml` | SET by Compose | Docker value uses `mongo` service host. |
| Docker-only config | `SQLITE_FILE` | SQLite fallback DB path | backend Docker | `docker-compose.yml` | SET by Compose | Ignored when Mongo profile sets `DB_TYPE=mongo`. |
| Tokens | `JWT_ACCESS_SECRET` | access token signing | backend local, backend Docker | `backend/src/config/env.ts`, `docker-compose.yml` | SET | Docker defaults are insecure and should be overridden outside local dev. |
| Tokens | `JWT_REFRESH_SECRET` | refresh/OAuth token signing | backend local, backend Docker | `backend/src/config/env.ts`, `docker-compose.yml` | SET | Docker defaults are insecure and should be overridden outside local dev. |
| Abuse controls | `RATE_LIMIT_MAX` | general API requests per minute and IP | backend local, backend Docker | `backend/src/shared/middlewares/security.ts` | OPTIONAL | Default `300`. In-memory per backend process. |
| Abuse controls | `AUTH_RATE_LIMIT_MAX` | sensitive auth operations per minute and IP | backend local, backend Docker | `backend/src/shared/middlewares/security.ts` | OPTIONAL | Default `10`. |
| Abuse controls | `AUTH_IDENTIFIER_RATE_LIMIT_MAX` | email/account bucket per minute | backend local, backend Docker | `backend/src/shared/middlewares/security.ts` | OPTIONAL | Default `5`; key contains SHA-256 of normalized email, not the email itself. |

## Provider separation contract

- Email config is guarded by `MailService`; missing SMTP credentials mean console
  dev mode. In production missing SMTP fails delivery instead of logging a reset
  token; the public recovery response remains generic.
- GitHub config is guarded by `GithubOAuthService.isConfigured()` and backend
  routes under `/api/auth/github*`.
- Telegram config is guarded by `TelegramBotService`; bot login uses GraphQL
  `telegramBotStart` / `telegramBotPoll`, not GitHub redirects.
- Disabled or broken Telegram must not stop GitHub/email.
- Disabled or broken GitHub must not stop Telegram/email.
- Disabled or broken email must not stop provider configuration checks for
  GitHub/Telegram.
- Secrets are backend-only. Do not add `GITHUB_CLIENT_SECRET`, `SMTP_PASS`, or
  `TELEGRAM_BOT_TOKEN` to frontend env.

## Recovery URL and cookie contract

- `FRONTEND_URL` must be an absolute `http` or `https` URL. Outside localhost,
  production startup requires HTTPS unless the operator explicitly sets the
  temporary staging escape hatch `ALLOW_INSECURE_PUBLIC_HTTP=true`.
- Email reset links are built with the `URL` API as
  `${FRONTEND_URL}/reset-password?token=...`; an optional sanitized relative
  `next` value is preserved.
- The browser exchanges the email token through the same-origin GraphQL proxy.
  The raw recovery grant is removed from the JSON response and stored as the
  `recovery_token` httpOnly cookie.
- `recovery_token` uses `SameSite=Strict`, path `/api/graphql`, and a 15-minute
  maximum age. It is cleared after successful completion or an invalid recovery
  response.
- `COOKIE_SECURE=false` is required for plain `http://localhost`. Set it to
  `true` only when the frontend is served through HTTPS.
