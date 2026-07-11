// Verifies refresh-token rotation against a real local backend process.
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  findFreePort,
  redactDiagnosticOutput,
  startCapturedProcess,
  stopManagedProcess,
  waitForHttp,
} from './test-process-utils.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const port = process.env.REFRESH_TEST_PORT
  ? Number(process.env.REFRESH_TEST_PORT)
  : await findFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const gqlUrl = `${baseUrl}/graphql`;
let backend;
let interruptedBy;

const interrupt = (signal) => {
  interruptedBy ??= signal;
  backend?.child.kill('SIGTERM');
};
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);

async function call(query, variables, token) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(gqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10_000),
  });
  return response.json();
}

let passed = 0;
let failed = 0;
const check = (name, condition, detail) => {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` ${JSON.stringify(detail)}` : ''}`);
  }
};

try {
  backend = startCapturedProcess(process.execPath, ['tests/start-test-backend.mjs'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      BACKEND_PORT: String(port),
      DB_TYPE: 'sqlite',
      SQLITE_FILE: ':memory:',
      JWT_ACCESS_SECRET: 'refresh_test_access',
      JWT_REFRESH_SECRET: 'refresh_test_refresh',
      JWT_ACCESS_EXPIRES: '2s',
      SMTP_USER: '',
      SMTP_PASS: '',
      AUTH_RATE_LIMIT_MAX: '100',
      AUTH_IDENTIFIER_RATE_LIMIT_MAX: '100',
    },
  });
  await waitForHttp(`${baseUrl}/health`, {
    child: backend.child,
    output: backend.output,
    timeoutMs: 15_000,
    accept: (status) => status === 200,
  });

  const signUp = await call(
    `mutation($i:SignUpInput!){signUp(input:$i){accessToken refreshToken}}`,
    { i: { email: 'refresh-flow@test.local', password: 'password123', name: 'Refresh' } },
  );
  const refresh = signUp.data?.signUp?.refreshToken;
  const access = signUp.data?.signUp?.accessToken;
  check('signup issued tokens', Boolean(refresh && access), signUp.errors);

  const refreshed = await call(
    `mutation($input:RefreshTokenInput!){refreshToken(input:$input){accessToken refreshToken}}`,
    { input: { refreshToken: refresh } },
  );
  const newAccess = refreshed.data?.refreshToken?.accessToken;
  const newRefresh = refreshed.data?.refreshToken?.refreshToken;
  check('proactive refresh mints new access token', Boolean(newAccess), refreshed.errors);
  check('proactive refresh rotates refresh token', Boolean(newRefresh && newRefresh !== refresh));

  const me = await call(`{ me { email } }`, {}, newAccess);
  check('minted access token authenticates me', me.data?.me?.email === 'refresh-flow@test.local', me);

  const link = await call(`mutation { oauthLinkToken }`, {}, newAccess);
  check('minted access token authorizes oauthLinkToken', Boolean(link.data?.oauthLinkToken), link.errors);

  const reuse = await call(
    `mutation($input:RefreshTokenInput!){refreshToken(input:$input){accessToken}}`,
    { input: { refreshToken: refresh } },
  );
  check('old refresh token revoked after rotation', !reuse.data?.refreshToken?.accessToken, reuse.errors);

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
} catch (error) {
  if (!interruptedBy) {
    console.error(error instanceof Error ? error.message : error);
    const backendOutput = backend?.output().trim();
    if (backendOutput) {
      console.error(`\nbackend output:\n${redactDiagnosticOutput(backendOutput)}`);
    }
  }
  failed += 1;
} finally {
  await stopManagedProcess(backend?.child);
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
}

process.exitCode = interruptedBy ? 130 : failed === 0 ? 0 : 1;
