import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const signIn = read('frontend/src/features/SignInForm/SignInForm.tsx');
const authFormStyles = read('frontend/src/features/AuthForm/AuthForm.module.scss');
const confirmEmail = read('frontend/src/features/ConfirmEmailForm/ConfirmEmailForm.tsx');
const authUseCases = read('backend/src/modules/auth/use-cases/AuthUseCases.ts');
const mailService = read('backend/src/infrastructure/mail/MailService.ts');

const checks = [
  [
    'sign-in has a visible register panel below the form',
    /auth-register-panel/.test(signIn) && /New to Authora\?/.test(signIn),
  ],
  [
    'register panel has dedicated styling',
    /\.auth-register-panel/.test(authFormStyles) && /\.auth-register-link/.test(authFormStyles),
  ],
  [
    'confirm-email buttons are grouped with spacing',
    /confirm-actions/.test(confirmEmail) && /display:\s*'flex'/.test(confirmEmail),
  ],
  [
    'email confirmation code is valid for 24 hours',
    /const CODE_TTL = 24 \* 60 \* 60 \* 1000/.test(authUseCases),
  ],
  [
    'email copy says the code expires in 24 hours',
    /expires in 24 hours/.test(mailService),
  ],
  [
    'email template has a branded HTML layout',
    /max-width:\s*640px/.test(mailService) &&
      /Verify your email/.test(mailService) &&
      /Open verification page/.test(mailService) &&
      /If you did not request this code/.test(mailService),
  ],
];

const failed = checks.filter(([, ok]) => !ok);

if (failed.length > 0) {
  console.error('Auth email/sign-in UX checks failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('Auth email/sign-in UX checks passed');
