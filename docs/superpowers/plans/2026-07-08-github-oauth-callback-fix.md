# GitHub OAuth Callback Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix GitHub OAuth authorization so GitHub receives a callback URL associated with the OAuth app, without changing Telegram login or email verification behavior.

**Architecture:** Keep GitHub, Telegram, and email flows isolated. GitHub remains a backend-owned OAuth web flow: frontend buttons redirect to backend `/api/auth/github`, backend builds the GitHub authorize URL, backend callback exchanges the code, then redirects to the frontend. Telegram continues to use the bot GraphQL flow, and email continues to use the existing code-confirmation mutations.

**Tech Stack:** Next.js frontend, Express backend, GitHub OAuth App web flow, TypeScript, static Node regression checks, existing Makefile/Yarn workflows.

## Global Constraints

- Do not edit Telegram files unless a Telegram-specific test fails: `frontend/src/features/TelegramLoginButton/TelegramLoginButton.tsx`, Telegram GraphQL mutations in `frontend/src/features/auth-api/authApi.ts`, and Telegram backend bot/auth services.
- Do not edit email sign-in/sign-up/confirmation behavior unless an email-specific test fails.
- Do not expose or change secret values such as `GITHUB_CLIENT_SECRET`, `TELEGRAM_BOT_TOKEN`, or SMTP credentials.
- Use official GitHub OAuth callback rules as the external source: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#redirect-urls
- Canonical local callback target for this plan: `http://localhost:3010/api/auth/github/callback`.
- External GitHub OAuth App settings must be checked manually; this repository cannot verify the app's configured callback URL from code.

---

## Current Evidence

- User-provided GitHub authorize URL contains `redirect_uri=http%3A%2F%2Flocalhost%3A5178%2Fapi%2Fauth%2Fgithub%2Fcallback`.
- `docker-compose.yml` currently sets `GITHUB_CALLBACK_URL: "http://localhost:5178/api/auth/github/callback"`.
- `backend/.env.example` currently sets `GITHUB_CALLBACK_URL=http://localhost:3010/api/auth/github/callback`.
- `backend/src/modules/auth/oauth/GithubOAuthService.ts` sends `env.github.callbackUrl` as `redirect_uri` in both the authorize URL and the token exchange.
- `frontend/src/features/GithubLoginButton/GithubLoginButton.tsx` starts GitHub by redirecting to `${config.backendPublicUrl}/api/auth/github`.
- `frontend/src/features/ConnectedAccounts/ConnectedAccounts.tsx` starts GitHub account linking by redirecting to `${config.backendPublicUrl}/api/auth/github?link=...`.
- `backend/src/app/oauthRoutes.ts` owns `/api/auth/github` and `/api/auth/github/callback`.
- `frontend/src/app/api/auth/github/callback/route.ts` is a proxy callback route, but the current backend-owned flow does not require GitHub to use the frontend callback for local development.

## File Structure

- Modify: `tests/auth-auto-code-and-redirect.mjs`
  - Add GitHub callback config regression checks beside the existing auth-flow static checks.
- Modify: `docker-compose.yml`
  - Align the Docker runtime `GITHUB_CALLBACK_URL` with the backend callback URL.
- Optional manual-only local check: `backend/.env`
  - Confirm the local non-secret callback URL is `http://localhost:3010/api/auth/github/callback`.
  - Do not change secret values.
- No changes planned:
  - `frontend/src/features/TelegramLoginButton/TelegramLoginButton.tsx`
  - Telegram parts of `frontend/src/features/auth-api/authApi.ts`
  - Email forms and email confirmation files.

---

### Task 1: Add a Regression Check for GitHub Callback Consistency

**Files:**
- Modify: `tests/auth-auto-code-and-redirect.mjs`

**Interfaces:**
- Consumes: existing `read(path)` helper and `checks` array.
- Produces: static checks that fail when Docker/example callback URLs diverge or when GitHub stops using its own OAuth route.

- [ ] **Step 1: Write the failing test**

Add these reads near the existing file reads:

```js
const dockerCompose = read('docker-compose.yml');
const backendEnvExample = read('backend/.env.example');
const githubOAuthService = read('backend/src/modules/auth/oauth/GithubOAuthService.ts');
const githubLoginButton = read('frontend/src/features/GithubLoginButton/GithubLoginButton.tsx');
const connectedAccounts = read('frontend/src/features/ConnectedAccounts/ConnectedAccounts.tsx');

function extractGithubCallback(source, label) {
  const match = source.match(/GITHUB_CALLBACK_URL[:=]\s*["']?([^"'\n]+)["']?/);
  if (!match) throw new Error(`Missing GITHUB_CALLBACK_URL in ${label}`);
  return match[1].trim();
}

const dockerGithubCallbackUrl = extractGithubCallback(dockerCompose, 'docker-compose.yml');
const exampleGithubCallbackUrl = extractGithubCallback(backendEnvExample, 'backend/.env.example');
const canonicalGithubCallbackUrl = 'http://localhost:3010/api/auth/github/callback';
```

Add these checks to the `checks` array:

```js
[
  'github callback config is consistent across docker and backend example',
  dockerGithubCallbackUrl === canonicalGithubCallbackUrl &&
    exampleGithubCallbackUrl === canonicalGithubCallbackUrl,
],
[
  'github authorize and token exchange use the same configured callback url',
  /redirect_uri:\s*env\.github\.callbackUrl/.test(githubOAuthService) &&
    /redirect_uri:\s*env\.github\.callbackUrl/.test(githubOAuthService.slice(
      githubOAuthService.indexOf('async exchangeCode'),
    )),
],
[
  'github UI entrypoints stay on the github backend route',
  /\/api\/auth\/github/.test(githubLoginButton) &&
    /\/api\/auth\/github\?link=/.test(connectedAccounts) &&
    !/telegramBotStart|telegramBotPoll/.test(githubLoginButton),
],
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node tests/auth-auto-code-and-redirect.mjs
```

Expected before the fix:

```text
Auth auto-code/redirect checks failed:
- github callback config is consistent across docker and backend example
```

---

### Task 2: Align the GitHub Callback URL Without Touching Other Providers

**Files:**
- Modify: `docker-compose.yml`

**Interfaces:**
- Consumes: `backend/src/config/env.ts` reading `process.env.GITHUB_CALLBACK_URL`.
- Produces: Docker backend runtime value matching `backend/.env.example` and the chosen canonical callback.

- [ ] **Step 1: Make the minimal config change**

Change only the non-secret callback URL in `docker-compose.yml`:

```yaml
      FRONTEND_URL: "http://localhost:5178"
      GITHUB_CALLBACK_URL: "http://localhost:3010/api/auth/github/callback"
      CORS_ORIGINS: "http://localhost:5178"
```

Do not change these lines in the same patch:

```yaml
      # OAuth/Telegram/SMTP secrets (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET,
      # TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_URL, SMTP_*) come from the env_file
```

- [ ] **Step 2: Run the regression check**

Run:

```bash
node tests/auth-auto-code-and-redirect.mjs
```

Expected:

```text
Auth auto-code/redirect checks passed
```

---

### Task 3: Verify the Runtime Redirect Shape

**Files:**
- No code changes unless this task exposes a mismatch.

**Interfaces:**
- Consumes: running backend at `http://localhost:3010`.
- Produces: evidence that `/api/auth/github` redirects to GitHub with `redirect_uri=http://localhost:3010/api/auth/github/callback`.

- [ ] **Step 1: Start the app in the normal project way**

Run:

```bash
make dev
```

Expected:

```text
backend (:3010) + frontend (:5178) are running
```

- [ ] **Step 2: Inspect the GitHub authorize redirect**

Run in another terminal:

```bash
curl -sI http://localhost:3010/api/auth/github
```

Expected:

```text
HTTP/1.1 302 Found
Location: https://github.com/login/oauth/authorize?...redirect_uri=http%3A%2F%2Flocalhost%3A3010%2Fapi%2Fauth%2Fgithub%2Fcallback...
```

- [ ] **Step 3: Verify the external GitHub OAuth App setting**

In GitHub OAuth App settings, set the Authorization callback URL to:

```text
http://localhost:3010/api/auth/github/callback
```

I cannot confirm this setting from the repository. This is an external GitHub configuration step.

---

### Task 4: Guard Telegram and Email Against Regressions

**Files:**
- No code changes.

**Interfaces:**
- Consumes: existing static auth checks and frontend TypeScript.
- Produces: evidence that GitHub-only config work did not alter Telegram/email source paths.

- [ ] **Step 1: Run existing auth static checks**

Run:

```bash
node tests/auth-auto-code-and-redirect.mjs
```

Expected:

```text
Auth auto-code/redirect checks passed
```

- [ ] **Step 2: Run frontend typecheck**

Run:

```bash
cd frontend && yarn run typecheck
```

Expected:

```text
$ tsc --noEmit
Done
```

- [ ] **Step 3: Manual smoke checks**

Open:

```text
http://localhost:5178/sign-in
http://localhost:5178/profile/edit
```

Check:

```text
GitHub button redirects to GitHub with redirect_uri on :3010.
Telegram button still opens its Telegram bot flow.
Email confirmation code UI still accepts six digits and keeps focus.
```

---

## Self-Review

- Spec coverage: fixes the GitHub `redirect_uri` mismatch shown in the user URL, keeps Telegram/email untouched, and adds regression checks.
- Placeholder scan: no `TBD`, `TODO`, or undefined follow-up behavior.
- Type consistency: no new TypeScript interfaces are introduced; Node static checks reuse the existing test style.
- Risk note: the repository can align runtime config, but it cannot verify or edit the callback URL saved inside the GitHub OAuth App. That external setting must be checked manually.
