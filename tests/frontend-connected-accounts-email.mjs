import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(
  resolve(root, 'frontend/src/features/ConnectedAccounts/ConnectedAccounts.tsx'),
  'utf8',
);
const ruProfile = JSON.parse(
  readFileSync(resolve(root, 'frontend/src/locales/ru/profile.json'), 'utf8'),
);
const enProfile = JSON.parse(
  readFileSync(resolve(root, 'frontend/src/locales/en/profile.json'), 'utf8'),
);

const checks = [
  [
    'imports email confirmation API',
    /confirmEmailCode/.test(source) && /resendEmailCode/.test(source),
  ],
  [
    'renders a localized Email account row',
    /label=\{t\('security\.email\.label'\)\}/.test(source) &&
      ruProfile.security?.email?.label === 'Email' &&
      enProfile.security?.email?.label === 'Email',
  ],
  ['tracks email verification status', /emailVerified/.test(source)],
  ['lets profile request an email code', /requestEmailCode/.test(source)],
  ['lets profile confirm an email code', /confirmEmail/.test(source)],
];

const failed = checks.filter(([, ok]) => !ok);

if (failed.length > 0) {
  console.error('ConnectedAccounts email verification checks failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('ConnectedAccounts email verification checks passed');
