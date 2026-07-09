# Auth env contract

Date: 2026-07-09

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
| GitHub | `GITHUB_CALLBACK_URL` | GitHub OAuth callback | backend local, backend Docker | `backend/src/config/env.ts`, `GithubOAuthService.ts`, `docker-compose.yml` | SET | Docker sets `http://localhost:3010/api/auth/github/callback`. |
| Telegram | `TELEGRAM_BOT_TOKEN` | `getMe`, `getUpdates`, bot messages | backend local, backend Docker | `backend/src/config/env.ts`, `TelegramBotService.ts` | root `.env` placeholder before fix; `backend/.env` SET len 46 | Must match Telegram token shape and pass `getMe`. |
| Telegram | `TELEGRAM_BOT_URL` | bot deep-link base | backend local, backend Docker | `backend/src/config/env.ts`, `TelegramBotService.ts` | SET | Does not prove the token works; `getMe` is still required. |
| Telegram | `TELEGRAM_BOT_USERNAME` | not used | none | none | MISSING | Current bot flow derives username through `getMe` or uses `TELEGRAM_BOT_URL`. |
| Frontend public URLs | `NEXT_PUBLIC_BACKEND_URL` | browser redirect to backend OAuth routes | frontend build | `frontend/src/shared/config/index.ts` | SET in `frontend/.env` | Build-time public value for Next.js. |
| Frontend public URLs | `NEXT_PUBLIC_APP_NAME` | app display name | frontend build | `frontend/src/shared/config/index.ts`, `next.config.mjs` | SET in example/config | Safe to expose. |
| Frontend server URLs | `BACKEND_INTERNAL_URL` | Next server proxy to backend GraphQL | frontend local, frontend Docker | `frontend/src/shared/config/index.ts`, `docker-compose.yml` | SET | Docker runtime uses `http://backend:3010`. |
| Backend public URLs | `FRONTEND_URL` | email links and backend OAuth redirects to frontend | backend local, backend Docker | `backend/src/config/env.ts`, `oauthRoutes.ts`, `MailService.ts` | SET | Docker sets `http://localhost:5178`. |
| Backend public URLs | `CORS_ORIGINS` | backend CORS allowlist | backend local, backend Docker | `backend/src/config/env.ts` | SET | Comma-separated list. |
| Cookies | `COOKIE_SECURE` | httpOnly cookie Secure flag | backend and frontend proxy | `backend/src/config/env.ts`, `frontend/src/shared/api/requestHandler.ts` | SET | Keep `false` on plain localhost. |
| Docker-only config | `DB_TYPE` | repository selection | backend Docker | `docker-compose.yml`, `docker-compose.mongo.yml` | SET by Compose | Mongo profile forces `mongo`. |
| Docker-only config | `MONGO_URI` | Mongo connection | backend Docker | `docker-compose.yml`, `docker-compose.mongo.yml` | SET by Compose | Docker value uses `mongo` service host. |
| Docker-only config | `SQLITE_FILE` | SQLite fallback DB path | backend Docker | `docker-compose.yml` | SET by Compose | Ignored when Mongo profile sets `DB_TYPE=mongo`. |
| Tokens | `JWT_ACCESS_SECRET` | access token signing | backend local, backend Docker | `backend/src/config/env.ts`, `docker-compose.yml` | SET | Docker defaults are insecure and should be overridden outside local dev. |
| Tokens | `JWT_REFRESH_SECRET` | refresh/OAuth token signing | backend local, backend Docker | `backend/src/config/env.ts`, `docker-compose.yml` | SET | Docker defaults are insecure and should be overridden outside local dev. |

## Provider separation contract

- Email config is guarded by `MailService`; missing SMTP credentials mean console
  dev mode, but configured SMTP failures return `MAIL_SEND_FAILED`.
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
