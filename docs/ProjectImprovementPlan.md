# Authora Project Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Authora from a working auth/profile/public-location app into a cleaner, more maintainable final project with stronger FSD boundaries, clearer store ownership, smaller backend use cases, safer env handling, and a more reliable test/ops loop.

**Architecture:** Keep the current monorepo split: `backend` as Express + GraphQL + Clean Architecture / Feature Modules, and `frontend` as Next.js App Router + FSD. The plan avoids a rewrite; it proposes incremental tasks that can be reviewed and tested independently.

**Tech Stack:** Backend: Node.js, TypeScript, Express, GraphQL, MongoDB, SQLite, JWT, bcrypt, nodemailer, speakeasy, qrcode, sharp. Frontend: Next.js, React, TypeScript, Redux Toolkit, Redux Thunk, Axios, Sass, PWA.

## Global Constraints

- Do not add new npm dependencies by default; add a dependency only after a separate decision.
- Keep route files thin: `frontend/src/app/**/page.tsx` should compose widgets/features, not own business logic.
- Preserve FSD layers: `shared` is reusable infrastructure/UI, `entities` owns domain data, `features` owns user actions, `widgets` composes page sections, `processes` owns app-wide orchestration.
- Preserve backend Clean Architecture: business rules stay in module use cases/domain, Express/GraphQL stay in `backend/src/app`.
- Preserve GraphQL proxy cookie model: browser code calls `/api/graphql`, frontend API route stores tokens in httpOnly cookies.
- Every implementation task must include a red/green test or a source-level regression check before code changes.
- Run at least `yarn run typecheck` in the changed package before marking a task complete.

---

## Source Snapshot

This plan is based on the local repository state inspected on 2026-07-09.

- `README.md` describes the app as auth, profile, public locations, MongoDB/SQLite backend, and Next.js FSD frontend.
- `PLAN.md` defines the intended Clean Architecture backend and FSD frontend layers.
- `test task.md` lists the original requirements: auth, profile, 3 database modes, Makefile/Docker, frontend FSD.
- `frontend/src` already has `app`, `processes`, `widgets`, `features`, `entities`, and `shared` directories.
- `backend/src` already has `app`, `config`, `core`, `modules`, `infrastructure`, and `shared`.
- `frontend/src/processes/store/rootReducer.ts` currently combines `auth`, `profile`, `location`, and `ui`.
- `frontend/src/features/auth-api/authApi.ts` currently centralizes many auth, OAuth, 2FA, email, and Telegram GraphQL calls in one feature-level API file.
- `backend/src/modules/auth/use-cases/AuthUseCases.ts` is 540 lines and owns email auth, sessions, password reset, 2FA, OAuth, Telegram linking, and provider unlinking.
- `backend/src/app/graphql/schema.ts` and `backend/src/app/graphql/resolvers.ts` are centralized GraphQL files.
- `backend/src/infrastructure/database/repositories/index.ts` supports MongoDB and SQLite; `postgres` currently throws an explicit "not implemented yet" error.
- `tests/` contains source-level auth/env checks, k6 load tests, security audit, and frontend regression scripts; `backend/tests/` contains profile-photo unit/use-case tests.

## Priority Map

| Priority | Area                                | Why now                                                                                                     | Main files                                                                                |
| -------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| P0       | Env, Docker, auth diagnostics       | Recent Telegram/OAuth issues showed config drift can break flows even when UI code is correct.              | `docker-compose.yml`, `backend/src/config/env.ts`, `Makefile`, `tests/*env*`              |
| P1       | Frontend FSD boundaries             | The layers exist, but auth API/store ownership can be clearer.                                              | `frontend/src/features/auth-api`, `frontend/src/entities`, `frontend/src/processes/store` |
| P1       | Store selectors and state ownership | Components should depend on selectors and feature APIs, not slice shape.                                    | `frontend/src/processes/store/**`                                                         |
| P1       | Backend auth decomposition          | `AuthUseCases.ts` has multiple responsibilities and should be split behind a facade.                        | `backend/src/modules/auth/**`                                                             |
| P2       | GraphQL modularization              | Central schema/resolvers are manageable now but will grow with Postgres, photos, locations, admin features. | `backend/src/app/graphql/**`, `backend/src/modules/**`                                    |
| P2       | Tests and CI-like commands          | Existing tests are useful but scattered. A standard local gate will reduce regressions.                     | `tests/`, `backend/tests/`, `Makefile`                                                    |
| P3       | UI kit and design consistency       | `/ui` exists and should become the canonical component contract for final polish.                           | `frontend/src/entities/ui-kit`, `frontend/src/shared/ui`                                  |

---

## Task 1: Add A Project Task Registry

**Goal:** Put future work in one navigable place instead of scattering plans across README, PLAN, and ad hoc notes.

**Files:**

- Create: `docs/tasks/README.md`
- Create: `docs/tasks/000-project-improvement-roadmap.md`
- Modify: `README.md`

**Steps:**

- [ ] Create `docs/tasks/README.md` with categories:
  - `architecture`
  - `frontend-fsd`
  - `backend`
  - `store`
  - `testing`
  - `ops-env`
  - `ui-ux`

- [ ] Move the high-level task list from this file into `docs/tasks/000-project-improvement-roadmap.md`.

- [ ] Add a short README link under the existing Roadmap section:

```md
For the implementation roadmap and improvement backlog, see `docs/tasks/README.md`.
```

- [ ] Verify:

```bash
rg -n "docs/tasks/README.md|project improvement" README.md docs
```

**Acceptance criteria:**

- README links to a task registry.
- New improvement tasks live under `docs/tasks`.
- No implementation details are hidden only in chat history.

---

## Task 2: Formalize Frontend FSD Boundaries

**Goal:** Make the frontend layer rules explicit and enforceable by tests.

**Current evidence:**

- FSD directories exist under `frontend/src`.
- `features/auth-api/authApi.ts` currently mixes sign-in, sign-up, email confirmation, password reset, 2FA, OAuth, provider unlink, and Telegram bot API calls.
- `features` components import process thunks and entity APIs directly in several places.

**Files:**

- Create: `docs/frontend-fsd-boundaries.md`
- Create: `tests/frontend-fsd-boundaries.mjs`
- Modify during this task: `frontend/src/features/auth-api/authApi.ts`

**Steps:**

- [ ] Document allowed dependencies:
  - `shared` imports nothing from app layers.
  - `entities` may import `shared`.
  - `features` may import `entities` and `shared`.
  - `widgets` may import `features`, `entities`, and `shared`.
  - `processes` may orchestrate app-wide state and providers.
  - `app` composes pages/routes only.

- [ ] Add a source-level regression test that fails on forbidden imports:

```bash
node tests/frontend-fsd-boundaries.mjs
```

- [ ] Start with practical checks:
  - no import from `@/features` inside `shared`;
  - no import from `@/widgets` inside `features`, `entities`, or `shared`;
  - no import from `@/app` outside `app`;
  - no React UI import into `entities/*/api`.

**Acceptance criteria:**

- A developer can tell where a new API/client/store/model file belongs.
- The boundary test prevents the most expensive layer leaks.

---

## Task 3: Split Auth API By Domain Ownership

**Goal:** Replace the single `features/auth-api/authApi.ts` surface with smaller API modules that match FSD ownership.

**Current evidence:**

- `frontend/src/features/auth-api/authApi.ts` is 207 lines and contains unrelated flows.

**Target files:**

- Create: `frontend/src/entities/session/api/sessionApi.ts`
- Create: `frontend/src/entities/user/api/authUserApi.ts`
- Create: `frontend/src/features/email-confirmation/api/emailConfirmationApi.ts`
- Create: `frontend/src/features/password-reset/api/passwordResetApi.ts`
- Create: `frontend/src/features/two-factor/api/twoFactorApi.ts`
- Create: `frontend/src/features/oauth-linking/api/oauthLinkingApi.ts`
- Create: `frontend/src/features/telegram-auth/api/telegramBotApi.ts`
- Keep temporarily: `frontend/src/features/auth-api/authApi.ts` as a compatibility barrel.

**Steps:**

- [ ] Write a source test that checks every existing export from `authApi.ts` is re-exported from a new module or from the temporary barrel.

- [ ] Move session operations:
  - `signIn`
  - `signUp`
  - `signInTwoFactor` only until Task 5 splits 2FA
  - `logout`
  - `oauthExchange`

- [ ] Move email operations:
  - `confirmEmailCode`
  - `resendEmailCode`

- [ ] Move password reset operations:
  - `requestPasswordReset`
  - `resetPassword`

- [ ] Move two-factor operations:
  - `enableTwoFactor`
  - `confirmTwoFactor`
  - `disableTwoFactor`

- [ ] Move provider linking operations:
  - `getOAuthLinkToken`
  - `unlinkProvider`

- [ ] Move Telegram bot operations:
  - `telegramBotStart`
  - `telegramBotPoll`

- [ ] Update imports in:
  - `frontend/src/processes/store/slices/authSlice.ts`
  - `frontend/src/features/ConnectedAccounts/ConnectedAccounts.tsx`
  - `frontend/src/features/TelegramLoginButton/TelegramLoginButton.tsx`
  - `frontend/src/features/GithubLoginButton/GithubLoginButton.tsx`
  - `frontend/src/app/oauth/complete/OAuthComplete.tsx`

**Verification:**

```bash
node tests/auth-auto-code-and-redirect.mjs
cd frontend && yarn run typecheck
```

**Acceptance criteria:**

- No component imports the old `features/auth-api/authApi.ts` directly.
- The compatibility barrel has a named cleanup target after all imports are migrated.

---

## Task 4: Add Store Selectors And Narrow Component Coupling

**Goal:** Components should depend on selectors and thunks, not on raw slice shape.

**Current evidence:**

- `rootReducer.ts` combines `auth`, `profile`, `location`, and `ui`.
- Components read state through `useAppSelector((s) => s.auth)` or similar patterns.

**Files:**

- Create: `frontend/src/processes/store/selectors/authSelectors.ts`
- Create: `frontend/src/processes/store/selectors/profileSelectors.ts`
- Create: `frontend/src/processes/store/selectors/locationSelectors.ts`
- Create: `frontend/src/processes/store/selectors/index.ts`
- Modify: components that read `s.auth`, `s.profile`, or `s.location` directly.

**Selectors to add first:**

```ts
export const selectAuthUser = (state: RootState) => state.auth.user
export const selectAuthStatus = (state: RootState) => state.auth.status
export const selectIsAuthenticated = (state: RootState) => state.auth.status === 'authenticated'
export const selectTwoFactorToken = (state: RootState) => state.auth.twoFactorToken
export const selectAuthError = (state: RootState) => state.auth.error
```

**Steps:**

- [ ] Add selectors.
- [ ] Add a regression test that requires selectors to exist.
- [ ] Replace direct `s.auth` reads in auth/profile pages.
- [ ] Repeat for profile and location state.

**Verification:**

```bash
cd frontend && yarn run typecheck
node tests/auth-auto-code-and-redirect.mjs
```

**Acceptance criteria:**

- UI components no longer know raw auth slice shape unless they are store-specific.
- Renaming a slice field requires fewer component edits.

---

## Task 5: Decompose Large Frontend Features

**Goal:** Keep feature files small enough to review and test without losing context.

**Current evidence:**

- `frontend/src/features/ConnectedAccounts/ConnectedAccounts.tsx` is 290 lines.
- `frontend/src/features/EditProfileForm/EditProfileForm.tsx` is 219 lines.
- `frontend/src/features/SignInForm/SignInForm.tsx` is 182 lines.

**Target split:**

```text
frontend/src/features/ConnectedAccounts/
  model/
    connectedAccountsModel.ts
  ui/
    ConnectedAccounts.tsx
    ConnectedAccountRow.tsx
    EmailVerificationPanel.tsx
    OAuthAccountsPanel.tsx
    TwoFactorPanel.tsx
  index.ts
```

**Steps:**

- [ ] Create a source test that checks `ConnectedAccountRow` is module-level and not recreated inside render.
- [ ] Extract email verification UI and code handling into `EmailVerificationPanel.tsx`.
- [ ] Extract GitHub/Telegram linking UI into `OAuthAccountsPanel.tsx`.
- [ ] Extract 2FA UI into `TwoFactorPanel.tsx`.
- [ ] Keep `ConnectedAccounts.tsx` as composition only.

**Verification:**

```bash
node tests/frontend-connected-accounts-email.mjs
node tests/auth-auto-code-and-redirect.mjs
cd frontend && yarn run typecheck
```

**Acceptance criteria:**

- `ConnectedAccounts.tsx` is a composition shell, not the owner of every provider/email/2FA detail.
- The email code input keeps focus while typing.
- Telegram and GitHub linking flows remain separate.

---

## Task 6: Decompose Backend Auth Use Cases Behind A Facade

**Goal:** Preserve the existing GraphQL API while splitting `AuthUseCases.ts` into focused services.

**Current evidence:**

- `backend/src/modules/auth/use-cases/AuthUseCases.ts` is 540 lines.
- It owns sign-up, email confirmation, sign-in, refresh, logout, password reset, change password, 2FA, OAuth handoff/linking, Telegram login/linking.

**Target files:**

```text
backend/src/modules/auth/use-cases/
  AuthUseCases.ts              # facade kept for GraphQL container compatibility
  EmailAuthUseCases.ts         # signUp, confirmEmailCode, resendEmailCode
  SessionUseCases.ts           # signIn, refresh, logout
  PasswordUseCases.ts          # requestPasswordReset, resetPassword, changePassword
  TwoFactorUseCases.ts         # enable/confirm/disable/signInTwoFactor
  OAuthUseCases.ts             # GitHub/OAuth handoff/link/unlink
  TelegramBotAuthUseCases.ts   # telegram bot start/poll/login/link
  AuthTokenIssuer.ts           # issueTokens only
```

**Steps:**

- [ ] Add tests around the current public facade behavior before moving code.
- [ ] Extract `AuthTokenIssuer` first because many flows need tokens.
- [ ] Extract email confirmation flows.
- [ ] Extract session refresh/logout flows.
- [ ] Extract password flows.
- [ ] Extract 2FA flows.
- [ ] Extract OAuth and Telegram flows last.
- [ ] Keep `AuthUseCases` constructor signature stable until all resolvers/tests pass.

**Verification:**

```bash
cd backend && yarn run typecheck
make backend-test
make backend-test-sqlite
node tests/security/audit.mjs
```

**Acceptance criteria:**

- GraphQL resolvers still call `ctx.container.auth.*`.
- Each auth sub-use-case file has one responsibility.
- Existing smoke/security tests pass.

---

## Task 7: Modularize GraphQL Schema And Resolvers

**Goal:** Keep GraphQL growth manageable as profile photos, OAuth, locations, and future Postgres/admin features grow.

**Current evidence:**

- `backend/src/app/graphql/schema.ts` centralizes all types and mutations.
- `backend/src/app/graphql/resolvers.ts` centralizes auth, profile, images, locations, OAuth, and Telegram resolvers.

**Target files:**

```text
backend/src/app/graphql/
  schema.ts          # merges module typedefs
  resolvers.ts       # merges module resolvers
backend/src/modules/auth/graphql/
  auth.typeDefs.ts
  auth.resolvers.ts
backend/src/modules/profile/graphql/
  profile.typeDefs.ts
  profile.resolvers.ts
backend/src/modules/profile-photo/graphql/
  profilePhoto.typeDefs.ts
  profilePhoto.resolvers.ts
backend/src/modules/location/graphql/
  location.typeDefs.ts
  location.resolvers.ts
```

**Steps:**

- [ ] Move `DateTime` scalar and `requireAuth` to shared GraphQL helpers.
- [ ] Move location types/resolvers first because they are mostly read-only.
- [ ] Move profile-photo types/resolvers.
- [ ] Move profile types/resolvers.
- [ ] Move auth types/resolvers last.
- [ ] Keep final merged `typeDefs` and `resolvers` exports identical for the app.

**Verification:**

```bash
cd backend && yarn run typecheck
make backend-test
make backend-test-sqlite
```

**Acceptance criteria:**

- Module-owned GraphQL files live near module use cases.
- `backend/src/app/graphql/schema.ts` and `resolvers.ts` become composition files.

---

## Task 8: Decide PostgreSQL Strategy

**Goal:** Either implement PostgreSQL or explicitly remove it from "supported" wording until it exists.

**Current evidence:**

- README says PostgreSQL is remaining work.
- `createRepositories()` throws for `DB_TYPE="postgres"`.
- PLAN lists PostgreSQL via Sequelize as a requirement.

**Options:**

1. Implement PostgreSQL repositories and migrations.
2. Keep PostgreSQL as planned work and make README/env/docs consistently say "planned, not available".

**Recommended path:** choose option 2 first, then implement option 1 in a separate feature branch.

**Files for option 2:**

- Modify: `README.md`
- Modify: `backend/.env.example`
- Modify: `.env.example`
- Create: `docs/tasks/postgres-roadmap.md`

**Verification:**

```bash
rg -n "postgres|PostgreSQL|DB_TYPE=postgres" README.md PLAN.md backend .env.example
cd backend && yarn run typecheck
```

**Acceptance criteria:**

- A developer cannot mistakenly think `DB_TYPE=postgres` works today.
- The future PostgreSQL work has a dedicated roadmap.

---

## Task 9: Add Env And Runtime Doctor Commands

**Goal:** Catch invalid configuration before the user opens the browser.

**Recent risk area:** Telegram can fail because the bot URL exists while the token is invalid or absent.

**Files:**

- Create: `backend/src/config/envDoctor.ts`
- Create: `tests/env-doctor.mjs`
- Modify: `Makefile`

**Checks to include:**

- `BACKEND_PORT` is numeric.
- `FRONTEND_URL` and `CORS_ORIGINS` are parseable URLs.
- `DB_TYPE` is one of `mongo`, `sqlite`, `postgres`.
- `TELEGRAM_BOT_URL` without `TELEGRAM_BOT_TOKEN` is a warning.
- `TELEGRAM_BOT_TOKEN` is not a short placeholder.
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are both set or both empty.
- SMTP is either fully configured or clearly in console fallback mode.

**Makefile commands:**

```makefile
env-doctor:
	cd backend && yarn run env:doctor
```

**Verification:**

```bash
node tests/env-doctor.mjs
make env-doctor
```

**Acceptance criteria:**

- Bad local env gives a direct actionable message.
- The command does not print secret values.

---

## Task 10: Standardize Test Gates

**Goal:** Make "what should I run before commit?" obvious.

**Current evidence:**

- Tests exist across `tests/*.mjs`, `backend/tests/*.ts`, k6 scripts, security audit, and package typechecks.
- There is no single lightweight `make check` command in the inspected Makefile.

**Files:**

- Modify: `Makefile`
- Create: `tests/check-source.mjs`
- Modify: `tests/README.md`

**Suggested commands:**

```makefile
check-source:
	node tests/auth-auto-code-and-redirect.mjs
	node tests/auth-email-and-signin-ux.mjs
	node tests/frontend-connected-accounts-email.mjs
	node tests/docker-compose-env-files.mjs
	node tests/telegram-bot-config-guard.mjs
	node tests/theme-hydration.mjs
	node tests/sass-deprecation-warnings.mjs

check-types:
	cd backend && yarn run typecheck
	cd frontend && yarn run typecheck

check:
	make check-source
	make check-types
```

**Acceptance criteria:**

- `make check` is fast enough for normal commits.
- Heavy load/security tests stay available as `make test-all`.

---

## Task 11: Strengthen UI Kit As A Real Contract

**Goal:** Make `/ui` the source of truth for shared UI components and interaction states.

**Current evidence:**

- `frontend/src/entities/ui-kit/ui/UiKitShowcase.tsx` and `frontend/src/widgets/page-blocks/UiKitPage` exist.
- `frontend/src/shared/ui` contains core controls: `ButtonMain`, `InputMain`, `ModalMain`, `Tabs`, `Toast`, `ThemeToggle`, and more.

**Files:**

- Modify: `frontend/src/entities/ui-kit/ui/UiKitShowcase.tsx`
- Modify: `frontend/src/widgets/page-blocks/UiKitPage/ui/UiKitPage.tsx`
- Create: `docs/ui-kit-contract.md`

**States to add for each reusable control:**

- default
- hover/focus-visible
- disabled
- loading where supported
- error/help text where supported
- compact/mobile width
- light/dark theme

**Verification:**

```bash
cd frontend && yarn run typecheck
```

Manual routes:

```text
http://localhost:5178/ui
http://localhost:5178/profile/edit
http://localhost:5178/sign-in
```

**Acceptance criteria:**

- New shared UI components are not considered complete until visible on `/ui`.
- `/ui` shows realistic states, not only happy-path examples.

---

## Task 12: Improve Profile And Image Domain Boundaries

**Goal:** Keep profile data, profile images, and auth identity data from drifting together.

**Current evidence:**

- Profile image backend has its own domain/use-cases/tests.
- Frontend profile slice currently owns profile loading/saving and profile image upload/delete thunks.

**Target structure:**

```text
frontend/src/entities/profile/model/
  profileTypes.ts
  profileSelectors.ts
frontend/src/entities/profile-photo/model/
  profilePhotoTypes.ts
frontend/src/features/ProfilePhotoManager/model/
  profilePhotoManagerModel.ts
```

**Steps:**

- [ ] Move profile-photo thunk ownership out of `profileSlice` or isolate it in a profile-photo slice.
- [ ] Keep `ProfilePhotoManager` responsible for UI workflow only.
- [ ] Keep profile API responsible for profile fields only.

**Verification:**

```bash
cd frontend && yarn run typecheck
cd backend && yarn run typecheck
```

**Acceptance criteria:**

- Updating profile text fields does not require profile image state changes.
- Upload/delete image state can show independent loading/error states.

---

## Task 13: Add Observability For Auth And External Providers

**Goal:** Make GitHub, Telegram, SMTP, and token-refresh failures diagnosable without reading source code.

**Files:**

- Create: `backend/src/shared/observability/logger.ts`
- Create: `backend/src/modules/auth/services/AuthDiagnostics.ts`
- Modify: `TelegramBotService.ts`
- Modify: `MailService.ts`
- Modify: `oauthRoutes.ts`

**Events to log without secrets:**

- Telegram bot configured: yes/no.
- Telegram `getMe` status: ok/unauthorized/not found/network error.
- GitHub OAuth callback received: yes/no, state valid/invalid.
- SMTP mode: console fallback or SMTP transport.
- Refresh token rotation: success/reuse detected/revoked.

**Verification:**

```bash
cd backend && yarn run typecheck
node tests/security/audit.mjs
```

**Acceptance criteria:**

- Logs never print token, password, SMTP secret, or OAuth secret.
- Provider failures include enough context to choose the next action.

---

## Task 14: Performance And PWA Polish

**Goal:** Improve perceived speed and final-app quality without changing core behavior.

**Current evidence:**

- Frontend has `manifest.json`, service worker, offline page, global loading, and PWA registration.
- Profile photos use backend image processing via `sharp`.

**Work items:**

- [ ] Audit route-level loading states for:
  - `/`
  - `/sign-in`
  - `/profile/edit`
  - `/country`
  - `/country/[id]`
  - `/region/[id]`
  - `/city/[id]`

- [ ] Ensure profile images have stable dimensions to prevent layout shift.

- [ ] Review service worker update behavior so stale assets do not trap old UI code.

- [ ] Add a docs page:

```text
docs/frontend-performance-checklist.md
```

**Verification:**

```bash
cd frontend && yarn run build
```

Manual routes:

```text
http://localhost:5178/
http://localhost:5178/profile/edit
http://localhost:5178/country
```

**Acceptance criteria:**

- Pages do not jump when profile images or location data load.
- Offline fallback still works.
- Build output has no unexpected warnings.

---

## Suggested Execution Order

1. Task 1: task registry.
2. Task 10: standard test gates.
3. Task 2: FSD boundary rules.
4. Task 3: split auth API.
5. Task 4: add selectors.
6. Task 5: split large frontend features.
7. Task 9: env doctor.
8. Task 13: auth/provider observability.
9. Task 6: backend auth decomposition.
10. Task 7: GraphQL modularization.
11. Task 8: PostgreSQL decision.
12. Task 11: UI kit contract.
13. Task 12: profile/photo boundary.
14. Task 14: performance and PWA polish.

## Commit Strategy

Use small commits:

```text
docs: add project improvement roadmap
test: add frontend fsd boundary checks
refactor(auth): split frontend auth api modules
refactor(store): add typed selectors
refactor(profile): split connected accounts panels
refactor(auth): split backend auth use cases
refactor(graphql): modularize schema and resolvers
chore(env): add runtime doctor checks
test: add standard source check command
docs(ui): document ui kit contract
```

## Final Verification Gate

Before considering the roadmap implemented, run:

```bash
make check
make backend-test
make backend-test-sqlite
make test-all
cd frontend && yarn run build
```

If `make test-all` depends on unavailable local services or external credentials, record the exact missing dependency in the task result instead of marking it as passed.
