/* eslint-disable no-console */
/**
 * End-to-end smoke test for the SQLite implementation.
 * Uses an in-memory SQLite database (no external services required).
 * Run: yarn run test:smoke:sqlite
 */
async function main() {
  process.env.DB_TYPE = 'sqlite';
  process.env.SQLITE_FILE = ':memory:';
  process.env.BACKEND_PORT = '3998';
  process.env.JWT_ACCESS_SECRET = 'test_access';
  process.env.JWT_REFRESH_SECRET = 'test_refresh';
  process.env.JWT_ACCESS_EXPIRES = '15m';
  process.env.AUTH_RATE_LIMIT_MAX = '100';
  process.env.AUTH_IDENTIFIER_RATE_LIMIT_MAX = '100';
  process.env.NODE_ENV = 'development';
  process.env.SMTP_USER = '';
  process.env.SMTP_PASS = '';

  const { connectSqlite, disconnectSqlite, getSqlite } = await import(
    './src/infrastructure/database/sqlite/connection.js'
  );
  const { createApp } = await import('./src/app/express.js');
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

  const gql = async (query: string, variables?: any, token?: string): Promise<any> => {
    const res = await fetch(`${base}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
    return res.json() as Promise<any>;
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
  const health = (await (await fetch(`${base}/health`)).json()) as any;
  check('health db=sqlite', health.status === 'ok' && health.db === 'sqlite', health);

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

  // email confirmation by 6-digit code
  const crypto = await import('crypto');
  const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
  // wrong code rejected
  const wrong = await gql(
    `mutation($e:String!,$c:String!){ confirmEmailCode(email:$e, code:$c) }`,
    { e: 'bob@example.com', c: '000000' },
  );
  check('confirmEmailCode rejects wrong code', wrong.errors?.[0]?.extensions?.code === 'INVALID_TOKEN', wrong.errors);
  // inject a known code hash (server stores codes hashed) and confirm
  const userRow: any = db.prepare('SELECT id FROM users WHERE email = ?').get('bob@example.com');
  db.prepare(
    `INSERT INTO email_tokens (userId, tokenHash, type, expiresAt, createdAt)
     VALUES (?, ?, 'verify_email', ?, ?)`,
  ).run(userRow.id, sha256('424242'), new Date(Date.now() + 600000).toISOString(), new Date().toISOString());
  const confirmEmail = await gql(
    `mutation($e:String!,$c:String!){ confirmEmailCode(email:$e, code:$c) }`,
    { e: 'bob@example.com', c: '424242' },
  );
  check('confirmEmailCode accepts valid code', confirmEmail.data?.confirmEmailCode === true, confirmEmail.errors);
  const meVerified = await gql(`query { me { emailVerified } }`, undefined, accessToken);
  check('email now verified', meVerified.data?.me?.emailVerified === true, meVerified);

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
  const rotatedRefreshToken = refreshed.data?.refreshToken?.refreshToken;
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
  const enable = await gql(
    `mutation { enableTwoFactor { qrDataUrl recoveryCodes } }`,
    undefined,
    accessToken,
  );
  const twoFactorRecoveryCode = enable.data?.enableTwoFactor?.recoveryCodes?.[0];
  check('enableTwoFactor returns QR', (enable.data?.enableTwoFactor?.qrDataUrl || '').startsWith('data:image/png'), enable.errors);
  check(
    'enableTwoFactor returns one-time recovery codes',
    enable.data?.enableTwoFactor?.recoveryCodes?.length === 8 && !!twoFactorRecoveryCode,
    enable.errors,
  );

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

  const missingReset = await gql(
    `mutation($i: RequestPasswordResetInput!){ requestPasswordReset(input:$i) }`,
    { i: { email: 'missing@example.com' } },
  );
  check(
    'requestPasswordReset hides missing accounts',
    missingReset.data?.requestPasswordReset === true,
    missingReset.errors,
  );

  // Insert a known one-time email token so the complete GraphQL recovery flow
  // can be exercised without reading raw secrets from the mail transport.
  const resetToken = 'sqlite-account-recovery-token';
  db.prepare(
    `UPDATE email_tokens SET usedAt = ?
     WHERE userId = ? AND type = 'reset_password' AND usedAt IS NULL`,
  ).run(new Date().toISOString(), userRow.id);
  db.prepare(
    `INSERT INTO email_tokens (userId, tokenHash, type, expiresAt, createdAt)
     VALUES (?, ?, 'reset_password', ?, ?)`,
  ).run(
    userRow.id,
    sha256(resetToken),
    new Date(Date.now() + 600000).toISOString(),
    new Date().toISOString(),
  );

  const exchange = await gql(
    `mutation($token:String!){
      exchangePasswordResetToken(token:$token){ recoveryToken channel expiresAt }
    }`,
    { token: resetToken },
  );
  const recoveryToken = exchange.data?.exchangePasswordResetToken?.recoveryToken;
  check(
    'email token exchanges for a short-lived recovery grant',
    !!recoveryToken && exchange.data?.exchangePasswordResetToken?.channel === 'EMAIL',
    exchange.errors,
  );

  const invalidPassword = await gql(
    `mutation($i:CompletePasswordResetInput!){
      completePasswordReset(input:$i){ success }
    }`,
    { i: { recoveryToken, newPassword: 'short' } },
  );
  check(
    'server rejects an invalid new password without consuming the grant',
    invalidPassword.errors?.[0]?.extensions?.code === 'VALIDATION',
    invalidPassword.errors,
  );

  const completeReset = await gql(
    `mutation($i:CompletePasswordResetInput!){
      completePasswordReset(input:$i){ success channel accessToken user { email hasPassword } }
    }`,
    { i: { recoveryToken, newPassword: 'NewPassword1!' } },
  );
  check(
    'email recovery changes password without creating an authenticated session',
    completeReset.data?.completePasswordReset?.success === true &&
      completeReset.data?.completePasswordReset?.channel === 'EMAIL' &&
      !completeReset.data?.completePasswordReset?.accessToken,
    completeReset.errors,
  );

  const reusedEmailToken = await gql(
    `mutation($token:String!){ exchangePasswordResetToken(token:$token){ channel } }`,
    { token: resetToken },
  );
  check(
    'email recovery token is one-time',
    reusedEmailToken.errors?.[0]?.extensions?.code === 'RECOVERY_TOKEN_INVALID',
    reusedEmailToken.errors,
  );

  const reusedGrant = await gql(
    `mutation($i:CompletePasswordResetInput!){ completePasswordReset(input:$i){ success } }`,
    { i: { recoveryToken, newPassword: 'AnotherPassword1!' } },
  );
  check(
    'recovery grant is one-time',
    reusedGrant.errors?.[0]?.extensions?.code === 'RECOVERY_TOKEN_INVALID',
    reusedGrant.errors,
  );

  const staleAccess = await gql(`query { me { id } }`, undefined, accessToken);
  check(
    'password recovery invalidates existing access tokens',
    staleAccess.errors?.[0]?.extensions?.code === 'INVALID_TOKEN',
    staleAccess.errors,
  );

  const staleRefresh = await gql(
    `mutation($i:RefreshTokenInput!){ refreshToken(input:$i){ accessToken } }`,
    { i: { refreshToken: rotatedRefreshToken } },
  );
  check(
    'password recovery revokes existing refresh tokens',
    staleRefresh.errors?.[0]?.extensions?.code === 'INVALID_TOKEN',
    staleRefresh.errors,
  );

  const oldPasswordLogin = await gql(
    `mutation($i:SignInInput!){ signIn(input:$i){ needTwoFactor } }`,
    { i: { email: 'bob@example.com', password: 'password123' } },
  );
  check(
    'old password no longer signs in',
    oldPasswordLogin.errors?.[0]?.extensions?.code === 'INVALID_CREDENTIALS',
    oldPasswordLogin.errors,
  );

  const recoveredLogin = await gql(
    `mutation($i:SignInInput!){ signIn(input:$i){ needTwoFactor twoFactorToken } }`,
    { i: { email: 'bob@example.com', password: 'NewPassword1!' } },
  );
  check(
    'new password signs in and preserves configured 2FA',
    recoveredLogin.data?.signIn?.needTwoFactor === true &&
      !!recoveredLogin.data?.signIn?.twoFactorToken,
    recoveredLogin.errors,
  );

  const recovered2fa = await gql(
    `mutation($i:SignInTwoFactorInput!){
      signInTwoFactor(input:$i){ accessToken user { email } }
    }`,
    {
      i: {
        twoFactorToken: recoveredLogin.data?.signIn?.twoFactorToken,
        code: twoFactorRecoveryCode,
      },
    },
  );
  check(
    'recovered account can complete 2FA with a saved recovery code',
    !!recovered2fa.data?.signInTwoFactor?.accessToken,
    recovered2fa.errors,
  );

  const secondRecoveredLogin = await gql(
    `mutation($i:SignInInput!){ signIn(input:$i){ needTwoFactor twoFactorToken } }`,
    { i: { email: 'bob@example.com', password: 'NewPassword1!' } },
  );
  const reusedTwoFactorCode = await gql(
    `mutation($i:SignInTwoFactorInput!){ signInTwoFactor(input:$i){ accessToken } }`,
    {
      i: {
        twoFactorToken: secondRecoveredLogin.data?.signIn?.twoFactorToken,
        code: twoFactorRecoveryCode,
      },
    },
  );
  check(
    '2FA recovery code cannot be reused',
    reusedTwoFactorCode.errors?.[0]?.extensions?.code === 'INVALID_2FA_CODE',
    reusedTwoFactorCode.errors,
  );

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
