import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const signIn = read('frontend/src/features/SignInForm/SignInForm.tsx');
const signUp = read('frontend/src/features/SignUpForm/SignUpForm.tsx');
const confirmEmail = read('frontend/src/app/(auth)/confirm-email/ConfirmEmailForm.tsx');
const connectedAccounts = read('frontend/src/features/ConnectedAccounts/ConnectedAccounts.tsx');
const githubLoginButton = read('frontend/src/features/GithubLoginButton/GithubLoginButton.tsx');
const telegramLoginButton = read('frontend/src/features/TelegramLoginButton/TelegramLoginButton.tsx');
const connectedAccountsRenderSetup = connectedAccounts.slice(
  connectedAccounts.indexOf('export function ConnectedAccounts()'),
  connectedAccounts.indexOf('  return ('),
);

const checks = [
  [
    'sign-in waits for auth state and replaces history after success',
    /loadMeThunk/.test(signIn) && /completeAuthRedirect/.test(signIn) && /window\.location\.replace/.test(signIn),
  ],
  [
    'sign-up redirects straight to the email code screen',
    /\/confirm-email\?email=/.test(signUp) &&
      /encodeURIComponent\(email\.trim\(\)\)/.test(signUp) &&
      !/router\.replace\('\/profile\/edit'\)/.test(signUp),
  ],
  [
    '2FA auto-submits when six digits are entered',
    /AUTO_CODE_LENGTH/.test(signIn) && /handleTwoFactorCodeChange/.test(signIn),
  ],
  [
    'confirm-email auto-submits when six digits are entered',
    /AUTO_CODE_LENGTH/.test(confirmEmail) && /handleCodeChange/.test(confirmEmail),
  ],
  [
    'confirm-email refreshes auth state and redirects home after success',
    /loadMeThunk/.test(confirmEmail) &&
      /router\.replace\('\/'\)/.test(confirmEmail) &&
      !/router\.replace\('\/profile\/edit'\)/.test(confirmEmail),
  ],
  [
    'profile email verification auto-submits when six digits are entered',
    /AUTO_CODE_LENGTH/.test(connectedAccounts) && /handleEmailCodeChange/.test(connectedAccounts),
  ],
  [
    'profile email code input keeps focus while typing',
    /ConnectedAccountRow/.test(connectedAccounts) &&
      !/const\s+Row\s*=/.test(connectedAccountsRenderSetup),
  ],
  [
    'telegram opens an app-owned waiting page instead of about:blank',
    /\/oauth\/telegram\/opening/.test(telegramLoginButton) &&
      !/window\.open\(['"](?:about:blank)?['"]\s*,\s*['"]_blank['"]/.test(telegramLoginButton),
  ],
  [
    'telegram login flow stays separate from the github oauth redirect',
    /telegramBotStart/.test(telegramLoginButton) &&
      /telegramBotPoll/.test(telegramLoginButton) &&
      !/\/api\/auth\/github/.test(telegramLoginButton),
  ],
  [
    'github login flow stays separate from the telegram bot flow',
    /\/api\/auth\/github/.test(githubLoginButton) &&
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
