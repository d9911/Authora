import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const authFiles = [
  'frontend/src/features/SignInForm/SignInForm.tsx',
  'frontend/src/features/SignUpForm/SignUpForm.tsx',
  'frontend/src/features/ConfirmEmailForm/ConfirmEmailForm.tsx',
  'frontend/src/features/PasswordResetForm/PasswordResetForm.tsx',
  'frontend/src/features/PasswordResetForm/TelegramRecoveryPanel.tsx',
  'frontend/src/features/GithubLoginButton/GithubLoginButton.tsx',
  'frontend/src/features/TelegramLoginButton/TelegramLoginButton.tsx',
  'frontend/src/features/OAuthComplete/OAuthComplete.tsx',
  'frontend/src/features/TwoFactorSetup/TwoFactorSetup.tsx',
  'frontend/src/features/LogoutButton/LogoutButton.tsx',
];

for (const path of authFiles) {
  const source = read(path);
  assert.match(source, /useTranslation\(/, `${path} must translate its user-facing copy`);
}

for (const path of [
  'frontend/src/features/SignInForm/SignInForm.tsx',
  'frontend/src/features/SignUpForm/SignUpForm.tsx',
  'frontend/src/features/ConfirmEmailForm/ConfirmEmailForm.tsx',
  'frontend/src/features/PasswordResetForm/PasswordResetForm.tsx',
  'frontend/src/features/PasswordResetForm/TelegramRecoveryPanel.tsx',
  'frontend/src/features/TelegramLoginButton/TelegramLoginButton.tsx',
  'frontend/src/features/OAuthComplete/OAuthComplete.tsx',
  'frontend/src/features/LogoutButton/LogoutButton.tsx',
]) {
  const source = read(path);
  assert.match(source, /getLocalizedRoutes/, `${path} must preserve the URL locale in redirects`);
}

const graphqlClient = read('frontend/src/shared/api/graphqlClient.ts');
assert.match(graphqlClient, /getLocaleFromPathname/);
assert.match(graphqlClient, /getLocalizedRoutes/);
assert.match(graphqlClient, /window\.location\.pathname/);

const signIn = read(authFiles[0]);
assert.match(signIn, /translateError/);
assert.match(signIn, /getPostAuthRedirectPath/);
assert.doesNotMatch(signIn, />Sign in</);

for (const path of [
  'frontend/src/features/GithubLoginButton/GithubLoginButton.tsx',
  'frontend/src/features/TelegramLoginButton/TelegramLoginButton.tsx',
]) {
  assert.match(read(path), /getPostAuthRedirectPath/);
}

const routes = read('frontend/src/shared/lib/routes.ts');
assert.match(routes, /export function getPostAuthRedirectPath/);
assert.match(routes, /const explicitNextPath = optionalNextPath\(value\)/);
assert.match(routes, /explicitNextPath\s*\?\s*preserveUrlHash/);

console.log('i18n auth integration checks passed');
