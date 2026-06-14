/**
 * Authora security audit — boots the backend on in-memory SQLite and runs a
 * battery of OWASP-style checks against the real GraphQL/REST surface.
 *
 *   node tests/security/audit.mjs
 *
 * Exit code is non-zero if any HIGH/CRITICAL severity check fails.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as wait } from 'node:timers/promises';

const BE_DIR = new URL('../../backend/', import.meta.url).pathname;
const PORT = 3201;
const BASE = `http://127.0.0.1:${PORT}`;
const GQL = `${BASE}/graphql`;

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, severity = 'medium', detail) {
  const tag = ok ? '✓' : '✗';
  console.log(`  ${tag} [${severity}] ${name}${!ok && detail ? ' — ' + detail : ''}`);
  if (ok) pass++;
  else {
    fail++;
    failures.push({ name, severity });
  }
}

async function gql(query, variables, token) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(GQL, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
  let json = {};
  try {
    json = await res.json();
  } catch {
    /* non-json */
  }
  return { res, json };
}

async function waitForHealth(tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await wait(500);
  }
  throw new Error('backend did not become healthy');
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: BE_DIR, stdio: 'inherit' });
    p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} failed`))));
  });
}

async function main() {
  // node_modules is excluded from snapshots — install on demand, then build.
  if (!existsSync(`${BE_DIR}node_modules/.bin/tsc`)) {
    console.log('[audit] installing backend dependencies…');
    await run('npm', ['install']);
  }
  await run('npm', ['run', 'build']);

  const server = spawn('node', ['dist/app/server.js'], {
    cwd: BE_DIR,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      BACKEND_PORT: String(PORT),
      DB_TYPE: 'sqlite',
      SQLITE_FILE: ':memory:',
      JWT_ACCESS_SECRET: 'audit_access_secret',
      JWT_REFRESH_SECRET: 'audit_refresh_secret',
      CORS_ORIGINS: 'http://localhost:5178',
    },
    stdio: 'ignore',
  });

  try {
    await waitForHealth();
    console.log('\n=== Authora security audit ===\n');

    // Register a known user to exercise authenticated paths.
    const email = `audit_${Date.now()}@example.com`;
    const su = await gql(
      `mutation($i: SignUpInput!){ signUp(input:$i){ accessToken refreshToken user{ id } } }`,
      { i: { email, password: 'password123', name: 'Audit' } },
    );
    const access = su.json?.data?.signUp?.accessToken;
    const refresh = su.json?.data?.signUp?.refreshToken;

    /* 1. Protected query rejects anonymous access */
    {
      const { json } = await gql(`query { myProfile { id } }`);
      check(
        'Protected resolver (myProfile) denies anonymous',
        json?.errors?.[0]?.extensions?.code === 'UNAUTHORIZED',
        'high',
        JSON.stringify(json?.errors?.[0]?.extensions),
      );
    }

    /* 2. me is null (not error) for anonymous, no data leak */
    {
      const { json } = await gql(`query { me { id email } }`);
      check('Anonymous me returns null (no leak)', json?.data?.me === null, 'medium');
    }

    /* 3. Tampered JWT is rejected */
    {
      const tampered = (access || 'x.y.z').slice(0, -3) + 'AAA';
      const { json } = await gql(`query { myProfile { id } }`, {}, tampered);
      // Either code means "rejected": UNAUTHORIZED (no identity) or INVALID_TOKEN
      // (present-but-invalid → client should refresh). Both are safe.
      const code = json?.errors?.[0]?.extensions?.code;
      check(
        'Tampered JWT rejected',
        code === 'UNAUTHORIZED' || code === 'INVALID_TOKEN',
        'critical',
        `code=${code}`,
      );
    }

    /* 4. "none" alg / garbage token rejected */
    {
      const { json } = await gql(`query { myProfile { id } }`, {}, 'not-a-jwt');
      check('Garbage bearer token rejected', !!json?.errors, 'high');
    }

    /* 5. Password is never returned by the API */
    {
      const { json } = await gql(`query { me { id email } }`, {}, access);
      const meStr = JSON.stringify(json);
      check('User object never exposes password', !/"password"/i.test(meStr), 'critical');
      check(
        'User object never exposes twoFactorSecret',
        !/twoFactorSecret/i.test(meStr),
        'critical',
      );
    }

    /* 6. NoSQL/operator injection in email does not bypass auth */
    {
      const { json } = await gql(
        `mutation($i: SignInInput!){ signIn(input:$i){ accessToken } }`,
        { i: { email: { $ne: null }, password: { $ne: null } } },
      );
      // GraphQL typing should reject non-string; either way no token issued.
      check(
        'NoSQL operator-injection login blocked',
        !json?.data?.signIn?.accessToken,
        'critical',
      );
    }

    /* 7. Wrong password does not reveal whether the account exists */
    {
      const a = await gql(
        `mutation($i: SignInInput!){ signIn(input:$i){ accessToken } }`,
        { i: { email, password: 'wrongpass' } },
      );
      const b = await gql(
        `mutation($i: SignInInput!){ signIn(input:$i){ accessToken } }`,
        { i: { email: 'nobody@nowhere.tld', password: 'wrongpass' } },
      );
      const ca = a.json?.errors?.[0]?.extensions?.code;
      const cb = b.json?.errors?.[0]?.extensions?.code;
      check('Login error identical for bad-pass vs unknown-user', ca === cb && ca === 'INVALID_CREDENTIALS', 'medium');
    }

    /* 8. Weak password rejected at signup */
    {
      const { json } = await gql(
        `mutation($i: SignUpInput!){ signUp(input:$i){ accessToken } }`,
        { i: { email: `weak_${Date.now()}@x.com`, password: '123', name: 'W' } },
      );
      check('Weak password rejected (min length)', !!json?.errors, 'medium');
    }

    /* 9. Duplicate email rejected (no account takeover) */
    {
      const { json } = await gql(
        `mutation($i: SignUpInput!){ signUp(input:$i){ accessToken } }`,
        { i: { email, password: 'password123', name: 'Dup' } },
      );
      check('Duplicate email rejected', json?.errors?.[0]?.extensions?.code === 'EMAIL_TAKEN', 'high');
    }

    /* 10. Password reset does not enumerate accounts (always boolean true) */
    {
      const { json } = await gql(
        `mutation($i: RequestPasswordResetInput!){ requestPasswordReset(input:$i) }`,
        { i: { email: 'definitely-not-here@nowhere.tld' } },
      );
      check(
        'Password reset does not leak account existence',
        json?.data?.requestPasswordReset === true,
        'medium',
      );
    }

    /* 11. Refresh-token rotation: old token invalid after use */
    {
      const r1 = await gql(
        `mutation($i: RefreshTokenInput!){ refreshToken(input:$i){ accessToken refreshToken } }`,
        { i: { refreshToken: refresh } },
      );
      const newRefresh = r1.json?.data?.refreshToken?.refreshToken;
      const reuse = await gql(
        `mutation($i: RefreshTokenInput!){ refreshToken(input:$i){ accessToken } }`,
        { i: { refreshToken: refresh } },
      );
      check(
        'Refresh token rotation invalidates the old token',
        !!newRefresh && !reuse.json?.data?.refreshToken?.accessToken,
        'high',
      );
    }

    /* 12. access token cannot be used as a refresh token */
    {
      const { json } = await gql(
        `mutation($i: RefreshTokenInput!){ refreshToken(input:$i){ accessToken } }`,
        { i: { refreshToken: access } },
      );
      check('Access token rejected as refresh token', !json?.data?.refreshToken?.accessToken, 'high');
    }

    /* 13. OAuth link token requires authentication */
    {
      const { json } = await gql(`mutation { oauthLinkToken }`);
      check(
        'oauthLinkToken denies anonymous (no silent link)',
        json?.errors?.[0]?.extensions?.code === 'UNAUTHORIZED',
        'high',
      );
    }

    /* 14. Telegram callback rejects forged signature */
    {
      const res = await fetch(
        `${BASE}/api/auth/telegram/callback?id=1&hash=deadbeefdeadbeef&auth_date=1`,
        { redirect: 'manual' },
      );
      const loc = res.headers.get('location') || '';
      check(
        'Telegram forged signature rejected',
        res.status === 302 &&
          (loc.includes('error=telegram_signature') || loc.includes('telegram_not_configured')),
        'critical',
      );
    }

    /* 15. GitHub callback rejects mismatched CSRF state */
    {
      const res = await fetch(`${BASE}/api/auth/github/callback?code=x&state=forged`, {
        redirect: 'manual',
      });
      const loc = res.headers.get('location') || '';
      check(
        'GitHub CSRF state mismatch rejected',
        res.status === 302 && (loc.includes('error=github_state') || loc.includes('github_not_configured')),
        'high',
      );
    }

    /* 16. CORS does not reflect arbitrary origins */
    {
      const res = await fetch(`${BASE}/health`, { headers: { Origin: 'https://evil.example' } });
      const acao = res.headers.get('access-control-allow-origin');
      check(
        'CORS does not allow arbitrary origin',
        acao !== 'https://evil.example' && acao !== '*',
        'high',
        `ACAO=${acao}`,
      );
    }

    /* 17. Oversized payload is rejected (body limit) */
    {
      const big = 'a'.repeat(2 * 1024 * 1024); // 2MB > 1MB limit
      const res = await fetch(GQL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: `query { __typename }`, variables: { big } }),
      });
      check('Oversized request body rejected (413)', res.status === 413, 'low', `status=${res.status}`);
    }

    /* 18. Internal errors are not leaked in production mode */
    {
      const { json } = await gql(`query { me { id } `); // malformed query
      const msg = JSON.stringify(json);
      check(
        'No stack traces / internal paths leaked',
        !/\/app\/|node_modules|at Object|\.ts:\d+/.test(msg),
        'medium',
      );
    }

    /* 19. 2FA enable requires auth */
    {
      const { json } = await gql(`mutation { enableTwoFactor { qrDataUrl } }`);
      check('enableTwoFactor requires auth', json?.errors?.[0]?.extensions?.code === 'UNAUTHORIZED', 'high');
    }

    /* 20. Security headers present (X-Content-Type-Options etc.) */
    {
      const res = await fetch(`${BASE}/health`);
      check(
        'Security header: X-Content-Type-Options nosniff',
        res.headers.get('x-content-type-options') === 'nosniff',
        'medium',
        'missing',
      );
    }

    /* 21. Brute-force protection: repeated bad logins get rate-limited */
    {
      let limited = false;
      for (let i = 0; i < 30; i++) {
        const r = await fetch(GQL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            query: `mutation($i: SignInInput!){ signIn(input:$i){ accessToken } }`,
            variables: { i: { email, password: 'wrongpass' } },
          }),
        });
        if (r.status === 429) {
          limited = true;
          break;
        }
      }
      check('Brute-force login is rate-limited (429)', limited, 'high', 'no 429 after 30 attempts');
    }

    console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
    if (failures.length) {
      console.log('\nFailed checks:');
      for (const f of failures) console.log(`  - [${f.severity}] ${f.name}`);
    }
    const blocking = failures.filter((f) => f.severity === 'high' || f.severity === 'critical');
    server.kill('SIGKILL');
    process.exit(blocking.length ? 1 : 0);
  } catch (e) {
    console.error('audit error:', e);
    server.kill('SIGKILL');
    process.exit(2);
  }
}

main();
