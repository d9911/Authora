# Account recovery

Date: 2026-07-10

This document describes the recovery implementation currently present in the
repository. The source of truth is the code paths listed in each section.

## Supported recovery matrix

| Account state | Available path | Result |
|---|---|---|
| Contactable email | Email link | Password changes, all old sessions are revoked, user signs in again. |
| Linked Telegram | Telegram bot confirmation | Password changes, all old sessions are revoked, a new session is issued for the confirmed browser. |
| GitHub account with a verified email returned by GitHub | Email link | Same as a normal email account. |
| GitHub account without a contactable email | Linked Telegram or add email in Connected accounts | A synthetic GitHub address is never shown or used for mail. |
| Telegram-only account | Telegram bot confirmation | The synthetic `@telegram.local` address is never used for mail. |
| Passwordless OAuth account | Any configured recovery method | The same flow sets the first password. |
| No contactable email and no linked Telegram | None | The account must add a recovery method while it is still signed in. |

The matrix is derived from
`backend/src/modules/user/domain/User.ts`,
`backend/src/modules/auth/use-cases/PasswordUseCases.ts`, and
`frontend/src/features/ConnectedAccounts/ConnectedAccounts.tsx`.

## Browser routes

- `/sign-in`: preserves `next` in the Forgot password link and displays a
  success message after email recovery.
- `/forgot-password`: chooses Email or Telegram. Email always returns the same
  public response, whether the account exists or not.
- `/reset-password`: exchanges an email link token once, removes it from the
  address bar, then accepts `password` and `confirmPassword`.
- `/profile/edit`: Connected accounts shows configured recovery methods and
  lets a signed-in user add/change a recovery email or start password reset.

`next` is accepted only as a same-origin relative path. Email recovery returns
to `/sign-in?recovered=1&next=...`; after sign-in the existing auth flow loads
`me` and replaces the page with the sanitized target. Telegram recovery creates
a fresh session and can return directly to the target.

Sources:
`frontend/src/features/PasswordResetForm/PasswordResetForm.tsx`,
`frontend/src/features/PasswordResetForm/TelegramRecoveryPanel.tsx`,
`frontend/src/features/SignInForm/SignInForm.tsx`, and
`frontend/src/shared/lib/routes.ts`.

## GraphQL contract

```graphql
mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
  requestPasswordReset(input: $input)
}

mutation ExchangePasswordResetToken($token: String!) {
  exchangePasswordResetToken(token: $token) {
    recoveryToken
    channel
    expiresAt
  }
}

mutation CompletePasswordReset($input: CompletePasswordResetInput!) {
  completePasswordReset(input: $input) {
    success
    channel
    accessToken
    refreshToken
    user { id email hasPassword recoveryMethods }
  }
}

mutation TelegramRecoveryStart {
  telegramRecoveryStart { token botUrl confirmationCode }
}

mutation TelegramRecoveryPoll($token: String!) {
  telegramRecoveryPoll(token: $token) {
    status
    recovery { recoveryToken channel expiresAt }
  }
}
```

The browser does not receive `recoveryToken`, `accessToken`, or `refreshToken`.
The same-origin Next.js proxy removes these fields before serializing the
response and writes httpOnly cookies instead. Direct trusted GraphQL clients can
still use the schema fields.

The legacy `resetPassword(token, newPassword)` mutation remains for compatible
clients, but the browser uses exchange plus completion.

Sources: `backend/src/app/graphql/schema.ts`,
`backend/src/app/graphql/resolvers.ts`, and
`frontend/src/shared/api/requestHandler.ts`.

## Token lifecycle

| Artifact | Lifetime | Stored at rest | One-time rule |
|---|---:|---|---|
| Email reset link token | 1 hour | SHA-256 hash in `email_tokens` | Atomically consumed during exchange. |
| Recovery grant | 15 minutes | SHA-256 hash in `recovery_grants` | Atomically consumed during password completion. |
| Browser recovery cookie | 15 minutes | httpOnly, SameSite Strict, path `/api/graphql` | Cleared after completion or invalid-token response. |
| Telegram ticket | 5 minutes | MongoDB or SQLite `telegram_tickets` | Atomically resolved/cancelled and deleted after terminal polling. |
| Email-change code | 15 minutes | SHA-256 hash plus target email in `email_tokens` | Atomically consumed for the current user. |
| 2FA recovery code | Until used or 2FA is disabled/reconfigured | SHA-256 hashes on the user record | Atomically removed after one successful 2FA challenge. |
| Access/refresh session | Configured by JWT env | Refresh token is stored as SHA-256 hash | Password change increments `authVersion` and revokes every refresh token. |

MongoDB uses atomic `findOneAndUpdate` for token consumption. SQLite wraps the
read-and-mark operation in a transaction and checks that exactly one row was
updated. Both implementations use parameterized values; no password, email,
code, or token is concatenated into SQL.

Sources:
`backend/src/infrastructure/database/mongo/MongoEmailTokenRepository.ts`,
`backend/src/infrastructure/database/mongo/MongoRecoveryGrantRepository.ts`,
`backend/src/infrastructure/database/sqlite/SqliteEmailTokenRepository.ts`, and
`backend/src/infrastructure/database/sqlite/SqliteRecoveryGrantRepository.ts`.

## Password and session rules

The server and browser validate the same allowlist policy:

```ts
/^[A-Za-zÑñ0-9!@#$%^&*()_+=.,?:~\[\]]{8,50}$/
```

Passwords are hashed with `bcryptjs`; plain-text passwords are not written to a
repository. Recovery tokens and refresh tokens use SHA-256 only because they
are cryptographically random bearer secrets, not user-chosen passwords.

On successful reset:

1. The recovery grant is consumed.
2. The password hash is replaced atomically with an `authVersion` increment.
3. All refresh tokens and remaining recovery grants for the user are revoked.
4. Existing access tokens fail the `authVersion` check in GraphQL context.
5. A password-changed email is attempted for contactable addresses.
6. Email recovery requires a fresh sign-in; Telegram recovery issues one new
   session only after the bot-confirmed recovery.

Existing 2FA remains enabled. Password recovery does not silently remove the
second factor. Enabling 2FA returns eight recovery codes once; each can replace
one TOTP challenge and is deleted atomically after use.

## Abuse and privacy controls

- Reset requests return the same Boolean and UI message for existing, missing,
  and synthetic-email accounts.
- Sensitive GraphQL operations are limited by IP. Email-bearing operations also
  use a SHA-256 identifier bucket, independent of the GraphQL variable name.
- GitHub can match an existing account by email only when GitHub reports that
  email as verified.
- Telegram recovery only looks up an already-linked `telegramId`; it never
  creates a new user and never auto-links an account.
- Recovery pages send `Cache-Control: no-store`, `Referrer-Policy: no-referrer`,
  and `X-Robots-Tag: noindex, nofollow`.
- Audit events use an allowlist of detail keys and exclude passwords, email
  addresses, raw tokens, and recovery cookies.

Sources: `backend/src/shared/middlewares/security.ts`,
`backend/src/modules/auth/services/ConsoleAuthAudit.ts`,
`frontend/next.config.mjs`, and
`backend/src/modules/auth/use-cases/AuthUseCases.ts`.

## Required configuration

Email recovery requires valid `FRONTEND_URL`, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, and `SMTP_PASS`. Telegram recovery requires
`TELEGRAM_BOT_TOKEN` and a resolvable bot URL. Production non-local
`FRONTEND_URL` must use HTTPS. Set `COOKIE_SECURE=true` only when the frontend
is actually served over HTTPS.

Rate-limit controls:

```dotenv
AUTH_RATE_LIMIT_MAX=10
AUTH_IDENTIFIER_RATE_LIMIT_MAX=5
```

See `backend/.env.example` and `docs/auth-env-contract.md`.

## Verification

```bash
make check
make backend-test-sqlite
cd frontend && yarn run build
```

`make check` includes source contracts, backend/frontend typechecks, compiled
use-case tests, and Telegram ticket behavior. `make backend-test-sqlite` starts
a temporary local GraphQL server and runs 34 checks, including complete email
recovery and one-time 2FA recovery-code use.

## Known operational limits

- Rate-limit buckets are in process memory. Multiple backend replicas require a
  shared limiter such as Redis for a global limit.
- Telegram tickets are shared through MongoDB/SQLite, but the `getUpdates`
  long-poller still needs one active worker. Multi-replica deployment should use
  leader election or a Telegram webhook receiver.
- Audit events currently go to structured console output; there is no external
  security-event sink or alerting integration.
- The repository includes executable SQLite recovery coverage. Mongo recovery
  repositories compile and share the same contracts, but an automated Mongo
  smoke test cannot run until `mongodb-memory-server` or a test Mongo service is
  added to the development environment.
