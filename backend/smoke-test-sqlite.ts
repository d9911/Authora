/* eslint-disable no-console */
/**
 * End-to-end smoke test for the SQLite implementation + Swagger docs.
 * Uses an in-memory SQLite database (no external services required).
 * Run: npx ts-node-dev --transpile-only smoke-test-sqlite.ts
 */
async function main() {
  process.env.DB_TYPE = 'sqlite';
  process.env.SQLITE_FILE = ':memory:';
  process.env.BACKEND_PORT = '3998';
  process.env.JWT_ACCESS_SECRET = 'test_access';
  process.env.JWT_REFRESH_SECRET = 'test_refresh';
  process.env.JWT_ACCESS_EXPIRES = '15m';

  const { connectSqlite, disconnectSqlite, getSqlite } = await import(
    './src/infrastructure/database/sqlite/connection'
  );
  const { createApp } = await import('./src/app/express');
  await connectSqlite();

  // seed locations directly
  const db = getSqlite();
  const now = new Date().toISOString();
  const cId = Number(
    db
      .prepare('INSERT INTO countries (name, code, createdAt, updatedAt) VALUES (?,?,?,?)')
      .run('Russia', 'RU', now, now).lastInsertRowid,
  );
  const rId = Number(
    db
      .prepare('INSERT INTO regions (name, countryId, createdAt, updatedAt) VALUES (?,?,?,?)')
      .run('Moscow Oblast', cId, now, now).lastInsertRowid,
  );
  db.prepare(
    'INSERT INTO cities (name, countryId, regionId, createdAt, updatedAt) VALUES (?,?,?,?,?)',
  ).run('Moscow', cId, rId, now, now);

  const app = createApp();
  const server = app.listen(3998);
  const base = 'http://localhost:3998';

  const gql = async (query: string, variables?: any, token?: string) => {
    const res = await fetch(`${base}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
    return res.json();
  };

  let passed = 0;
  let failed = 0;
  const check = (name: string, cond: boolean, extra?: any) => {
    if (cond) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      console.log(`  ✗ ${name}`, extra ? JSON.stringify(extra) : '');
    }
  };

  // health reports sqlite
  const health = await (await fetch(`${base}/health`)).json();
  check('health db=sqlite', health.status === 'ok' && health.db === 'sqlite', health);

  // swagger docs available
  const swaggerJson = await (await fetch(`${base}/swagger.json`)).json();
  check('swagger.json served', swaggerJson.openapi === '3.0.3' && !!swaggerJson.paths['/graphql'], {
    openapi: swaggerJson.openapi,
  });
  const docsRes = await fetch(`${base}/docs/`);
  const docsHtml = await docsRes.text();
  check('GET /docs serves Swagger UI', docsRes.status === 200 && docsHtml.includes('swagger-ui'));
  const exampleCount = Object.keys(
    swaggerJson.paths['/graphql'].post.requestBody.content['application/json'].examples,
  ).length;
  check('swagger has GraphQL examples', exampleCount >= 15, { exampleCount });

  // sign up
  const signUp = await gql(
    `mutation($i: SignUpInput!){ signUp(input:$i){ accessToken refreshToken needTwoFactor user{ id email emailVerified } } }`,
    { i: { email: 'bob@example.com', password: 'password123', name: 'Bob' } },
  );
  const auth = signUp.data?.signUp;
  check('signUp returns tokens', !!auth?.accessToken && !!auth?.refreshToken, signUp.errors);
  check('signUp user emailVerified=false', auth?.user?.emailVerified === false);
  const accessToken = auth?.accessToken;
  const refreshToken = auth?.refreshToken;

  // duplicate email
  const dup = await gql(`mutation($i: SignUpInput!){ signUp(input:$i){ accessToken } }`, {
    i: { email: 'bob@example.com', password: 'password123' },
  });
  check('duplicate email rejected', dup.errors?.[0]?.extensions?.code === 'EMAIL_TAKEN', dup.errors);

  // me
  const me = await gql(`query { me { id email } }`, undefined, accessToken);
  check('me returns user', me.data?.me?.email === 'bob@example.com', me);

  // bad password
  const bad = await gql(`mutation($i: SignInInput!){ signIn(input:$i){ accessToken } }`, {
    i: { email: 'bob@example.com', password: 'nope' },
  });
  check('bad password rejected', bad.errors?.[0]?.extensions?.code === 'INVALID_CREDENTIALS', bad.errors);

  // sign in
  const login = await gql(
    `mutation($i: SignInInput!){ signIn(input:$i){ accessToken needTwoFactor } }`,
    { i: { email: 'bob@example.com', password: 'password123' } },
  );
  check('signIn success', !!login.data?.signIn?.accessToken && login.data?.signIn?.needTwoFactor === false, login);

  // refresh rotation
  const refreshed = await gql(
    `mutation($i: RefreshTokenInput!){ refreshToken(input:$i){ accessToken refreshToken } }`,
    { i: { refreshToken } },
  );
  check('refresh returns new tokens', !!refreshed.data?.refreshToken?.refreshToken, refreshed.errors);
  const reuseOld = await gql(`mutation($i: RefreshTokenInput!){ refreshToken(input:$i){ accessToken } }`, {
    i: { refreshToken },
  });
  check('old refresh revoked after rotation', reuseOld.errors?.[0]?.extensions?.code === 'INVALID_TOKEN', reuseOld.errors);

  // update profile (upsert path)
  const upd = await gql(
    `mutation($i: UpdateProfileInput!){ updateProfile(input:$i){ bio gender timezone } }`,
    { i: { bio: 'sqlite bio', gender: 'male', timezone: 'Europe/Moscow', name: 'Bob B' } },
    accessToken,
  );
  check('updateProfile saves', upd.data?.updateProfile?.bio === 'sqlite bio', upd.errors);

  // myProfile reflects update
  const prof = await gql(`query { myProfile { bio timezone isVerified } }`, undefined, accessToken);
  check('myProfile returns saved data', prof.data?.myProfile?.timezone === 'Europe/Moscow', prof.errors);

  // 2FA enable + confirm + gated login
  const enable = await gql(`mutation { enableTwoFactor { qrDataUrl } }`, undefined, accessToken);
  check('enableTwoFactor returns QR', (enable.data?.enableTwoFactor?.qrDataUrl || '').startsWith('data:image/png'), enable.errors);

  const speakeasy = await import('speakeasy');
  const secretRow: any = db.prepare('SELECT twoFactorSecret FROM users WHERE email = ?').get('bob@example.com');
  const code = speakeasy.totp({ secret: secretRow.twoFactorSecret, encoding: 'base32' });
  const confirm = await gql(`mutation($c:String!){ confirmTwoFactor(code:$c) }`, { c: code }, accessToken);
  check('confirmTwoFactor with valid code', confirm.data?.confirmTwoFactor === true, confirm.errors);

  const login2 = await gql(
    `mutation($i: SignInInput!){ signIn(input:$i){ needTwoFactor twoFactorToken } }`,
    { i: { email: 'bob@example.com', password: 'password123' } },
  );
  check('signIn now needs 2FA', login2.data?.signIn?.needTwoFactor === true && !!login2.data?.signIn?.twoFactorToken, login2);

  // password reset request
  const reqReset = await gql(
    `mutation($i: RequestPasswordResetInput!){ requestPasswordReset(input:$i) }`,
    { i: { email: 'bob@example.com' } },
  );
  check('requestPasswordReset returns true', reqReset.data?.requestPasswordReset === true, reqReset.errors);

  // location queries
  const countries = await gql(`query { countries { id name regions { name cities { name } } } }`);
  check('countries query', countries.data?.countries?.[0]?.name === 'Russia', countries.errors);
  check('nested regions/cities resolve', countries.data?.countries?.[0]?.regions?.[0]?.cities?.[0]?.name === 'Moscow', countries.errors);

  const countryId = countries.data?.countries?.[0]?.id;
  const single = await gql(`query($id:ID!){ country(id:$id){ name code } }`, { id: countryId });
  check('country(id) query', single.data?.country?.code === 'RU', single.errors);

  console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);

  server.close();
  await disconnectSqlite();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
