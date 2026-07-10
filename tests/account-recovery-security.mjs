import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const security = read('backend/src/shared/middlewares/security.ts');
const authUseCases = read('backend/src/modules/auth/use-cases/AuthUseCases.ts');
const mailService = read('backend/src/infrastructure/mail/MailService.ts');
const nextConfig = read('frontend/next.config.mjs');
const requestHandler = read('frontend/src/shared/api/requestHandler.ts');
const envConfig = read('backend/src/config/env.ts');
const server = read('backend/src/app/server.ts');

for (const operation of [
  'exchangePasswordResetToken',
  'completePasswordReset',
  'telegramRecoveryStart',
  'telegramRecoveryPoll',
  'requestEmailChange',
  'confirmEmailChange',
]) {
  assert.ok(security.includes(`'${operation}'`), `${operation} must be rate limited`);
}

assert.match(security, /AUTH_IDENTIFIER_RATE_LIMIT_MAX/);
assert.match(security, /createHash\('sha256'\)/);
assert.match(security, /Object\.values\(variables \?\? \{\}\)/);
assert.match(authUseCases, /profile\.emailVerified/);
assert.match(mailService, /if \(env\.isProd\)/);
assert.match(nextConfig, /Referrer-Policy/);
assert.match(nextConfig, /no-referrer/);
assert.match(nextConfig, /no-store/);
assert.match(requestHandler, /sameSite:\s*'strict'/);
assert.match(envConfig, /validateRecoveryEnvironment/);
assert.match(server, /validateRecoveryEnvironment\(\)/);

console.log('Account recovery security checks passed');
