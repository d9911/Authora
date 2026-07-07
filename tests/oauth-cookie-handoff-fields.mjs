import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const authApiPath = path.join(root, 'frontend/src/features/auth-api/authApi.ts');
const source = fs.readFileSync(authApiPath, 'utf8');

function functionBody(name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} function should exist`);

  let depth = 0;
  let bodyStart = -1;
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') {
      depth += 1;
      if (bodyStart === -1) bodyStart = i + 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(bodyStart, i);
    }
  }
  throw new Error(`${name} function body was not closed`);
}

function assertRequestsTokenPair(name) {
  const body = functionBody(name);
  assert.match(body, /\baccessToken\b/, `${name} must request accessToken for proxy cookies`);
  assert.match(body, /\brefreshToken\b/, `${name} must request refreshToken for proxy cookies`);
}

assertRequestsTokenPair('oauthExchange');
assertRequestsTokenPair('telegramBotPoll');

