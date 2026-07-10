import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const jwt = read('backend/src/infrastructure/jwt/jwt.ts');
const context = read('backend/src/app/graphql/context.ts');
const authUseCases = read('backend/src/modules/auth/use-cases/AuthUseCases.ts');

assert.match(jwt, /authVersion:\s*number/);
assert.match(jwt, /interface RefreshTokenPayload[\s\S]*authVersion:\s*number/);
assert.match(jwt, /signRefreshToken\(payload:\s*RefreshTokenPayload/);
assert.match(context, /await container\.repos\.users\.findById\(payload\.sub\)/);
assert.match(context, /user\.authVersion\s*!==\s*payload\.authVersion/);
assert.match(authUseCases, /user\.authVersion\s*!==\s*payload\.authVersion/);

console.log('Account recovery session-version checks passed');
