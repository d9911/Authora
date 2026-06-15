// Verifies the PROXY logic: with only a refresh token, requests still work.
// We test the proxy's serverRefresh path by replicating it against the backend.
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const PORT = 3349;
const BASE = `http://127.0.0.1:${PORT}`;

const be = spawn('node', ['dist/app/server.js'], {
  cwd: new URL('.', import.meta.url).pathname,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    BACKEND_PORT: String(PORT),
    DB_TYPE: 'sqlite',
    SQLITE_FILE: ':memory:',
    JWT_ACCESS_SECRET: 'a',
    JWT_REFRESH_SECRET: 'b',
    JWT_ACCESS_EXPIRES: '2s',
  },
  stdio: 'ignore',
});

const GQL = `${BASE}/graphql`;
async function call(query, variables, token) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(GQL, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
  return res.json();
}

let pass = 0, fail = 0;
const check = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? '  ✓ ' + n : '  ✗ ' + n + (x ? ' ' + JSON.stringify(x) : '')); };

try {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${BASE}/health`)).ok) break; } catch {}
    await wait(250);
  }

  // sign up -> get refresh token only
  const su = await call(
    `mutation($i:SignUpInput!){signUp(input:$i){accessToken refreshToken}}`,
    { i: { email: 'pr@test.com', password: 'password123', name: 'PR' } },
  );
  const refresh = su.data.signUp.refreshToken;
  const access = su.data.signUp.accessToken;
  check('signup issued tokens', !!refresh && !!access);

  // Replicate proxy "proactive refresh": no access token, only refresh.
  const r = await call(
    `mutation($input:RefreshTokenInput!){refreshToken(input:$input){accessToken refreshToken}}`,
    { input: { refreshToken: refresh } },
  );
  const newAccess = r.data?.refreshToken?.accessToken;
  const newRefresh = r.data?.refreshToken?.refreshToken;
  check('proactive refresh mints new access token', !!newAccess, r.errors);
  check('proactive refresh rotates refresh token', !!newRefresh && newRefresh !== refresh);

  // Use the minted access token on a protected query.
  const me = await call(`{ me { email } }`, {}, newAccess);
  check('minted access token authenticates me', me.data?.me?.email === 'pr@test.com', me);

  // And a protected mutation that requires auth.
  const link = await call(`mutation { oauthLinkToken }`, {}, newAccess);
  check('minted access token authorizes oauthLinkToken', !!link.data?.oauthLinkToken, link.errors);

  // Old refresh token must be revoked (rotation security).
  const reuse = await call(
    `mutation($input:RefreshTokenInput!){refreshToken(input:$input){accessToken}}`,
    { input: { refreshToken: refresh } },
  );
  check('old refresh token revoked after rotation', !reuse.data?.refreshToken?.accessToken, reuse.errors);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
} catch (e) {
  console.error('error', e);
  fail++;
} finally {
  be.kill('SIGKILL');
  process.exit(fail === 0 ? 0 : 1);
}
