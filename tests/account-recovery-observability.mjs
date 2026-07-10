import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const auditPath = 'backend/src/modules/auth/services/ConsoleAuthAudit.ts';
assert.ok(existsSync(resolve(root, auditPath)), `Missing ${auditPath}`);

const audit = readFileSync(resolve(root, auditPath), 'utf8');
const passwords = readFileSync(
  resolve(root, 'backend/src/modules/auth/use-cases/PasswordUseCases.ts'),
  'utf8',
);
const authUseCases = readFileSync(
  resolve(root, 'backend/src/modules/auth/use-cases/AuthUseCases.ts'),
  'utf8',
);

for (const event of [
  'recovery_requested',
  'recovery_delivery_failed',
  'recovery_token_exchanged',
  'password_reset_completed',
]) {
  assert.ok(passwords.includes(`'${event}'`), `Missing audit event ${event}`);
}

assert.match(audit, /SAFE_DETAIL_KEYS/);
assert.doesNotMatch(audit, /rawToken|recoveryToken|password:/);
const recoveryStart = authUseCases.indexOf("purpose: 'recovery'");
const recoveryAudit = authUseCases.indexOf("record('telegram_recovery_started'", recoveryStart);
assert.ok(recoveryStart >= 0 && recoveryAudit > recoveryStart);

console.log('Account recovery observability checks passed');
