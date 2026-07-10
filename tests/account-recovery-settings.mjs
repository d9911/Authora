import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const apiPath = 'frontend/src/features/ConnectedAccounts/api/accountSecurityApi.ts';
assert.ok(existsSync(resolve(root, apiPath)), `Missing ${apiPath}`);

const api = read(apiPath);
const connectedAccounts = read('frontend/src/features/ConnectedAccounts/ConnectedAccounts.tsx');
const authUseCases = read('backend/src/modules/auth/use-cases/AuthUseCases.ts');

assert.match(api, /requestEmailChange/);
assert.match(api, /confirmEmailChange/);
assert.match(connectedAccounts, /newEmail/);
assert.match(connectedAccounts, /requestEmailChange/);
assert.match(connectedAccounts, /confirmEmailChange/);
assert.match(connectedAccounts, /user\?\.hasPassword/);
assert.match(connectedAccounts, /recoveryMethods/);
assert.match(authUseCases, /emailKind === 'synthetic'/);

console.log('Account recovery settings checks passed');
