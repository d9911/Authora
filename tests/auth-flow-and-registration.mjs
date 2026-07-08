import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const readOptional = (path) => {
  const fullPath = resolve(root, path);
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : '';
};

const headerMain = read('frontend/src/widgets/HeaderMain/HeaderMain.tsx');
const graphqlClient = read('frontend/src/shared/api/graphqlClient.ts');
const signUp = read('frontend/src/features/SignUpForm/SignUpForm.tsx');
const signInStyles = read('frontend/src/features/SignInForm/SignInForm.module.scss');
const editProfileForm = read('frontend/src/features/EditProfileForm/EditProfileForm.tsx');
const authUseCases = read('backend/src/modules/auth/use-cases/AuthUseCases.ts');
const sqliteUsers = read('backend/src/infrastructure/database/sqlite/SqliteUserRepository.ts');
const mongoUsers = read('backend/src/infrastructure/database/mongo/MongoUserRepository.ts');
const frontendPolicy = readOptional('frontend/src/shared/lib/passwordPolicy.ts');
const backendPolicy = readOptional('backend/src/modules/auth/domain/passwordPolicy.ts');

function extractPasswordRegex(source, label) {
  const match = source.match(/PASSWORD_ALLOWED_REGEX\s*=\s*(\/[^\n]+\/);/);
  if (!match) throw new Error(`Missing PASSWORD_ALLOWED_REGEX literal in ${label}`);
  return Function(`"use strict"; return ${match[1]};`)();
}

const passwordRegex = frontendPolicy ? extractPasswordRegex(frontendPolicy, 'frontend policy') : null;
const allowedPassword = 'AZazÑñ09!@#$%^&*()_+=.,?:~[]';
const disallowedCharacters = [`'`, '"', '`', '/', '\\', '<', '>', ';', '|', 'Ж'];

const checks = [
  [
    'header user nickname click opens an account menu instead of direct auth-guard navigation',
    /aria-haspopup="menu"/.test(headerMain) &&
      /account-menu/.test(headerMain) &&
      /toggleAccountMenu/.test(headerMain),
  ],
  [
    'client-side auth redirect preserves the attempted path in next',
    /redirectToSignIn/.test(graphqlClient) &&
      /encodeURIComponent\(nextPath\)/.test(graphqlClient) &&
      !/window\.location\.href\s*=\s*['"]\/sign-in['"]/.test(graphqlClient),
  ],
  [
    'profile page loads profile data even when auth was already hydrated by the header',
    /loadMyProfileThunk/.test(editProfileForm) &&
      /profile\s*===\s*null/.test(editProfileForm) &&
      /status\s*===\s*'authenticated'/.test(editProfileForm),
  ],
  [
    'sign-up form uses confirmPassword and mismatch copy',
    /confirmPassword/.test(signUp) && /Пароли не совпадают\./.test(signUp),
  ],
  [
    'sign-up form has accessible show-hide buttons for both password fields',
    /showPassword/.test(signUp) &&
      /showConfirmPassword/.test(signUp) &&
      /aria-label=\{ariaLabel\}/.test(signUp) &&
      /ariaLabel=\{showPassword/.test(signUp) &&
      /ariaLabel=\{showConfirmPassword/.test(signUp) &&
      /type="button"/.test(signUp),
  ],
  [
    'sign-up form validates with the shared frontend password policy',
    /PASSWORD_ALLOWED_REGEX/.test(signUp) &&
      /PASSWORD_POLICY_HINT/.test(signUp) &&
      /disabled=\{submitDisabled\}/.test(signUp),
  ],
  [
    'auth form styles contain stable password field and field-level error classes',
    /\.password-field/.test(signInStyles) &&
      /\.password-toggle/.test(signInStyles) &&
      /\.field-error/.test(signInStyles),
  ],
  [
    'frontend password regex accepts the allowed character set',
    Boolean(passwordRegex?.test(allowedPassword)),
  ],
  [
    'frontend password regex rejects forbidden characters',
    Boolean(passwordRegex && disallowedCharacters.every((char) => !passwordRegex.test(`Valid123${char}`))),
  ],
  [
    'frontend password regex rejects passwords longer than 50 characters',
    Boolean(passwordRegex && !passwordRegex.test('A'.repeat(51))),
  ],
  [
    'backend policy exposes the same password regex and validation helper',
    /PASSWORD_ALLOWED_REGEX/.test(backendPolicy) &&
      /validatePassword/.test(backendPolicy) &&
      backendPolicy.includes('Пароль должен быть 8–50 символов.'),
  ],
  [
    'backend auth use-cases use server-side password policy validation',
    /validatePassword\(input\.password\)/.test(authUseCases) &&
      /validatePassword\(newPassword\)/.test(authUseCases) &&
      !/password\.length\s*<\s*8/.test(authUseCases),
  ],
  [
    'sqlite user create uses prepared named parameters for user-controlled fields',
    /\.prepare\([\s\S]*INSERT INTO users/.test(sqliteUsers) &&
      /@email/.test(sqliteUsers) &&
      /@password/.test(sqliteUsers) &&
      /@name/.test(sqliteUsers) &&
      /\.run\(\{/.test(sqliteUsers) &&
      /email:/.test(sqliteUsers) &&
      /password:/.test(sqliteUsers) &&
      /name:/.test(sqliteUsers),
  ],
  [
    'mongo user create passes structured fields to the model, not a concatenated query string',
    /UserModel\.create\(\{[\s\S]*email:[\s\S]*password:[\s\S]*name:/.test(mongoUsers) &&
      !/findOne\([^)]*\+[^)]*email/.test(mongoUsers),
  ],
];

const failed = checks.filter(([, ok]) => !ok);

if (failed.length > 0) {
  console.error('Auth flow/registration checks failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('Auth flow/registration checks passed');
