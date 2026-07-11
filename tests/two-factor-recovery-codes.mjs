import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const user = read('backend/src/modules/user/domain/User.ts');
const userRepository = read('backend/src/modules/user/domain/UserRepository.ts');
const auth = read('backend/src/modules/auth/use-cases/AuthUseCases.ts');
const schema = read('backend/src/app/graphql/schema.ts');
const signIn = read('frontend/src/features/SignInForm/SignInForm.tsx');
const setup = read('frontend/src/features/TwoFactorSetup/TwoFactorSetup.tsx');
const enAuth = JSON.parse(read('frontend/src/locales/en/auth.json'));
const ruAuth = JSON.parse(read('frontend/src/locales/ru/auth.json'));

assert.match(user, /twoFactorRecoveryCodeHashes\?: string\[\]/);
assert.match(user, /Omit<[\s\S]*User,[\s\S]*'twoFactorRecoveryCodeHashes'/);
assert.match(userRepository, /consumeTwoFactorRecoveryCode/);
assert.match(auth, /generateRecoveryCodes/);
assert.match(auth, /consumeTwoFactorRecoveryCode/);
assert.match(schema, /recoveryCodes:\s*\[String!\]!/);
assert.match(signIn, /signIn\.twoFactor\.useRecoveryCode/);
assert.equal(enAuth.signIn.twoFactor.useRecoveryCode, 'Use recovery code');
assert.equal(ruAuth.signIn.twoFactor.useRecoveryCode, 'Использовать резервный код');
assert.match(setup, /recoveryCodes/);
assert.match(setup, /twoFactor\.action\.copyCodes/);
assert.equal(enAuth.twoFactor.action.copyCodes, 'Copy all codes');
assert.equal(ruAuth.twoFactor.action.copyCodes, 'Скопировать все коды');

console.log('Two-factor recovery-code checks passed');
