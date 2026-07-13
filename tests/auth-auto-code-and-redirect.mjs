import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const signIn = read('frontend/src/features/SignInForm/SignInForm.tsx');
const signUp = read('frontend/src/features/SignUpForm/SignUpForm.tsx');
const confirmEmail = read('frontend/src/features/ConfirmEmailForm/ConfirmEmailForm.tsx');
const connectedAccounts = read('frontend/src/features/ConnectedAccounts/ConnectedAccounts.tsx');
const githubLoginButton = read('frontend/src/features/GithubLoginButton/GithubLoginButton.tsx');
const telegramLoginButton = read('frontend/src/features/TelegramLoginButton/TelegramLoginButton.tsx');
const nextConfig = read('frontend/next.config.mjs');
const frontendDockerfile = read('frontend/Dockerfile');
const dockerCompose = read('docker-compose.yml');
const rootEnvExample = read('.env.example');
const backendEnvExample = read('backend/.env.example');
const githubOAuthService = read('backend/src/modules/auth/oauth/GithubOAuthService.ts');
const connectedAccountsRenderSetup = connectedAccounts.slice(
  connectedAccounts.indexOf('export function ConnectedAccounts()'),
  connectedAccounts.indexOf('  return ('),
);

function extractGithubCallback(source, label) {
  const match = source.match(/GITHUB_CALLBACK_URL[:=]\s*["']?([^"'\n]+)["']?/);
  if (!match) throw new Error(`Missing GITHUB_CALLBACK_URL in ${label}`);
  const configured = match[1].trim();
  const fallback = configured.match(/^\$\{GITHUB_CALLBACK_URL:-(.+)\}$/);
  return fallback?.[1] ?? configured;
}

const dockerGithubCallbackUrl = extractGithubCallback(dockerCompose, 'docker-compose.yml');
const exampleGithubCallbackUrl = extractGithubCallback(backendEnvExample, 'backend/.env.example');
const canonicalGithubCallbackUrl = 'http://localhost:3010/api/auth/github/callback';

const checks = [
  [
    'sign-in waits for auth state and replaces history after success',
    /loadMeThunk/.test(signIn) && /completeAuthRedirect/.test(signIn) && /window\.location\.replace/.test(signIn),
  ],
  [
    'sign-up redirects straight to the email code screen',
    /getLocalizedRoutes/.test(signUp) &&
      /routes\.confirmEmail/.test(signUp) &&
      /encodeURIComponent\(email\.trim\(\)\)/.test(signUp) &&
      !/router\.replace\('\/profile\/edit'\)/.test(signUp),
  ],
  [
    '2FA auto-submits when six digits are entered',
    /OtpCodeInput/.test(signIn) && /onComplete=\{\(value\) => void submitTwoFactorCode\(value\)\}/.test(signIn),
  ],
  [
    'confirm-email auto-submits when six digits are entered',
    /OtpCodeInput/.test(confirmEmail) && /onComplete=\{\(value\) => void submitCode\(value\)\}/.test(confirmEmail),
  ],
  [
    'confirm-email prefills email and code from the verification URL',
    /params\.get\('email'\)/.test(confirmEmail) &&
      /params\.get\('code'\)/.test(confirmEmail) &&
      /setEmail\(urlEmail\)/.test(confirmEmail) &&
      /setCode\(urlCode\)/.test(confirmEmail),
  ],
  [
    'confirm-email submits complete URL credentials only once',
    /nextEmail = email/.test(confirmEmail) &&
      /urlCode\.length !== DEFAULT_OTP_LENGTH/.test(confirmEmail) &&
      /autoSubmitKeyRef\.current === autoSubmitKey/.test(confirmEmail) &&
      /autoSubmitKeyRef\.current = autoSubmitKey/.test(confirmEmail) &&
      /submitCode\(urlCode, urlEmail\)/.test(confirmEmail),
  ],
  [
    'confirm-email protects URL credentials from caches, referrers, and indexing',
    /\['\/forgot-password', '\/reset-password', '\/confirm-email'\]/.test(nextConfig) &&
      /Cache-Control[^\n]+no-store/.test(nextConfig) &&
      /Referrer-Policy[^\n]+no-referrer/.test(nextConfig) &&
      /X-Robots-Tag[^\n]+noindex, nofollow/.test(nextConfig),
  ],
  [
    'confirm-email refreshes auth state and redirects home after success',
    /loadMeThunk/.test(confirmEmail) &&
      /getLocalizedRoutes/.test(confirmEmail) &&
      /router\.replace\(routes\.home\)/.test(confirmEmail) &&
      !/router\.replace\('\/profile\/edit'\)/.test(confirmEmail),
  ],
  [
    'profile email verification auto-submits when six digits are entered',
    /OtpCodeInput/.test(connectedAccounts) && /onComplete=\{\(value\) => void submitEmailCode\(value\)\}/.test(connectedAccounts),
  ],
  [
    'profile email code input keeps focus while typing',
    /ConnectedAccountRow/.test(connectedAccounts) &&
      !/const\s+Row\s*=/.test(connectedAccountsRenderSetup),
  ],
  [
    'telegram opens an app-owned waiting page instead of about:blank',
    /routes\.telegramOpening/.test(telegramLoginButton) &&
      !/window\.open\(['"](?:about:blank)?['"]\s*,\s*['"]_blank['"]/.test(telegramLoginButton),
  ],
  [
    'telegram login flow stays separate from the github oauth redirect',
    /telegramBotStart/.test(telegramLoginButton) &&
      /telegramBotPoll/.test(telegramLoginButton) &&
      !/\/api\/auth\/github/.test(telegramLoginButton),
  ],
  [
    'telegram link returns to profile with linked confirmation',
    /res\.status === 'linked'/.test(telegramLoginButton) &&
      /window\.location\.replace\(linkedTelegramProfilePath\)/.test(telegramLoginButton),
  ],
  [
    'github login flow stays separate from the telegram bot flow',
    /\/api\/auth\/github/.test(githubLoginButton) &&
      !/telegramBotStart|telegramBotPoll/.test(githubLoginButton),
  ],
  [
    'github callback config is consistent across docker and backend example',
    dockerGithubCallbackUrl === canonicalGithubCallbackUrl &&
      exampleGithubCallbackUrl === canonicalGithubCallbackUrl,
  ],
  [
    'docker github oauth urls can be overridden for a public deployment',
    /FRONTEND_URL:\s*["']?\$\{FRONTEND_URL:-http:\/\/localhost:5178\}/.test(dockerCompose) &&
      /CORS_ORIGINS:\s*["']?\$\{CORS_ORIGINS:-http:\/\/localhost:5178\}/.test(dockerCompose) &&
      /ALLOW_INSECURE_PUBLIC_HTTP:\s*["']?\$\{ALLOW_INSECURE_PUBLIC_HTTP:-false\}/.test(
        dockerCompose,
      ) &&
      /GITHUB_CALLBACK_URL:\s*["']?\$\{GITHUB_CALLBACK_URL:-http:\/\/localhost:3010\/api\/auth\/github\/callback\}/.test(
        dockerCompose,
      ) &&
      /^ALLOW_INSECURE_PUBLIC_HTTP=false$/m.test(rootEnvExample),
  ],
  [
    'frontend docker build receives the browser-facing oauth backend url',
    /NEXT_PUBLIC_BACKEND_URL:\s*["']?\$\{NEXT_PUBLIC_BACKEND_URL:-http:\/\/localhost:3010\}/.test(
      dockerCompose,
    ) &&
      /ARG NEXT_PUBLIC_BACKEND_URL=http:\/\/localhost:3010/.test(frontendDockerfile) &&
      /ENV NEXT_PUBLIC_BACKEND_URL=\$NEXT_PUBLIC_BACKEND_URL/.test(frontendDockerfile) &&
      /^NEXT_PUBLIC_BACKEND_URL=http:\/\/localhost:3010$/m.test(rootEnvExample),
  ],
  [
    'github authorize and token exchange use the same configured callback url',
    /redirect_uri:\s*env\.github\.callbackUrl/.test(githubOAuthService) &&
      /redirect_uri:\s*env\.github\.callbackUrl/.test(
        githubOAuthService.slice(githubOAuthService.indexOf('async exchangeCode')),
      ),
  ],
  [
    'github UI entrypoints stay on the github backend route',
    /\/api\/auth\/github/.test(githubLoginButton) &&
      /\/api\/auth\/github\?link=/.test(connectedAccounts) &&
      !/telegramBotStart|telegramBotPoll/.test(githubLoginButton),
  ],
];

const failed = checks.filter(([, ok]) => !ok);

if (failed.length > 0) {
  console.error('Auth auto-code/redirect checks failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('Auth auto-code/redirect checks passed');
