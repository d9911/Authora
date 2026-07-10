import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const requiredFiles = [
  'backend/src/modules/auth/domain/RecoveryGrantRepository.ts',
  'backend/src/modules/auth/use-cases/PasswordUseCases.ts',
  'backend/src/infrastructure/database/mongo/MongoRecoveryGrantRepository.ts',
  'backend/src/infrastructure/database/sqlite/SqliteRecoveryGrantRepository.ts',
  'frontend/src/features/password-reset/api/passwordResetApi.ts',
];

for (const path of requiredFiles) {
  assert.ok(existsSync(resolve(root, path)), `Missing account-recovery file: ${path}`);
}

const authUseCases = read('backend/src/modules/auth/use-cases/AuthUseCases.ts');
const schema = read('backend/src/app/graphql/schema.ts');
const resolvers = read('backend/src/app/graphql/resolvers.ts');
const requestHandler = read('frontend/src/shared/api/requestHandler.ts');
const frontendConfig = read('frontend/src/shared/config/index.ts');
const resetForm = read('frontend/src/features/PasswordResetForm/PasswordResetForm.tsx');
const telegramTickets = read('backend/src/modules/auth/oauth/TelegramTicketStore.ts');
const routes = read('frontend/src/shared/lib/routes.ts');

assert.match(authUseCases, /exchangePasswordResetToken/);
assert.match(authUseCases, /completePasswordReset/);
assert.match(authUseCases, /startTelegramRecovery/);
assert.match(authUseCases, /pollTelegramRecovery/);

assert.match(schema, /exchangePasswordResetToken/);
assert.match(schema, /completePasswordReset/);
assert.match(schema, /telegramRecoveryStart/);
assert.match(schema, /telegramRecoveryPoll/);
assert.match(resolvers, /exchangePasswordResetToken/);
assert.match(resolvers, /completePasswordReset/);

assert.match(frontendConfig, /recoveryToken:\s*'recovery_token'/);
assert.match(requestHandler, /config\.cookies\.recoveryToken/);
assert.match(requestHandler, /SESSION_INDEPENDENT_OPERATIONS/);
assert.match(requestHandler, /completePasswordReset/);

assert.match(resetForm, /confirmPassword/);
assert.match(resetForm, /PASSWORD_ALLOWED_REGEX/);
assert.match(resetForm, /Пароли не совпадают\./);
assert.match(resetForm, /autoComplete="new-password"/);
assert.match(routes, /resetPassword:/);

assert.match(telegramTickets, /purpose:\s*TelegramTicketPurpose/);
assert.match(telegramTickets, /'recovery'/);
assert.match(telegramTickets, /'cancelled'/);

console.log('Account recovery contract checks passed');
