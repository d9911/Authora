/* eslint-disable no-console */
/**
 * End-to-end smoke test against an in-memory MongoDB.
 * Run from the repository root with: node tests/run-mongo-smoke.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Server } from 'node:http';

let mongod: MongoMemoryServer | undefined;
let server: Server | undefined;
let disconnectMongo: (() => Promise<void>) | undefined;

async function cleanup() {
  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
  }
  if (disconnectMongo) {
    await disconnectMongo();
    disconnectMongo = undefined;
  }
  if (mongod) {
    await mongod.stop();
    mongod = undefined;
  }
}

async function main() {
  const port = Number(process.env.MONGO_SMOKE_PORT || 3999);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`MONGO_SMOKE_PORT must be an integer from 1 to 65535; received ${port}`);
  }

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  process.env.DB_TYPE = 'mongo';
  process.env.BACKEND_PORT = String(port);
  process.env.JWT_ACCESS_SECRET = 'test_access';
  process.env.JWT_REFRESH_SECRET = 'test_refresh';
  process.env.JWT_ACCESS_EXPIRES = '15m';
  // SMTP not configured -> emails logged to console

  const mongoConnection = await import('./src/infrastructure/database/mongo/connection.js');
  disconnectMongo = mongoConnection.disconnectMongo;
  const { createApp } = await import('./src/app/express.js');
  await mongoConnection.connectMongo();

  // seed locations
  const { CountryModel, RegionModel, CityModel } = await import(
    './src/infrastructure/database/mongo/models.js'
  );
  const country = await CountryModel.create({ name: 'Russia', code: 'RU' });
  const region = await RegionModel.create({ name: 'Moscow Oblast', countryId: country._id });
  await CityModel.create({ name: 'Moscow', countryId: country._id, regionId: region._id });

  const app = createApp();
  server = app.listen(port, '127.0.0.1');
  const base = `http://127.0.0.1:${port}`;

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

  // health
  const health = await (await fetch(`${base}/health`)).json();
  check('health ok', health.status === 'ok', health);

  // sign up
  const signUp = await gql(
    `mutation($i: SignUpInput!){ signUp(input:$i){ accessToken refreshToken needTwoFactor user{ id email emailVerified } } }`,
    { i: { email: 'alice@example.com', password: 'password123', name: 'Alice' } },
  );
  const auth = signUp.data?.signUp;
  check('signUp returns tokens', !!auth?.accessToken && !!auth?.refreshToken, signUp.errors);
  check('signUp user emailVerified=false', auth?.user?.emailVerified === false);
  const accessToken = auth?.accessToken;
  const refreshToken = auth?.refreshToken;

  // duplicate email -> EMAIL_TAKEN
  const dup = await gql(
    `mutation($i: SignUpInput!){ signUp(input:$i){ accessToken } }`,
    { i: { email: 'alice@example.com', password: 'password123' } },
  );
  check('duplicate email rejected (EMAIL_TAKEN)', dup.errors?.[0]?.extensions?.code === 'EMAIL_TAKEN', dup.errors);

  // me with token
  const me = await gql(`query { me { id email } }`, undefined, accessToken);
  check('me returns current user', me.data?.me?.email === 'alice@example.com', me);

  // me without token -> null
  const meAnon = await gql(`query { me { id } }`);
  check('me anonymous is null', meAnon.data?.me === null, meAnon);

  // sign in wrong password
  const badLogin = await gql(
    `mutation($i: SignInInput!){ signIn(input:$i){ accessToken } }`,
    { i: { email: 'alice@example.com', password: 'wrongpass' } },
  );
  check('bad password rejected', badLogin.errors?.[0]?.extensions?.code === 'INVALID_CREDENTIALS', badLogin.errors);

  // sign in correct
  const login = await gql(
    `mutation($i: SignInInput!){ signIn(input:$i){ accessToken needTwoFactor } }`,
    { i: { email: 'alice@example.com', password: 'password123' } },
  );
  check('signIn success', !!login.data?.signIn?.accessToken && login.data?.signIn?.needTwoFactor === false, login);

  // refresh token rotation
  const refreshed = await gql(
    `mutation($i: RefreshTokenInput!){ refreshToken(input:$i){ accessToken refreshToken } }`,
    { i: { refreshToken } },
  );
  const newRefresh = refreshed.data?.refreshToken?.refreshToken;
  check('refresh returns new tokens', !!newRefresh, refreshed.errors);

  // old refresh token now revoked (rotation)
  const reuseOld = await gql(
    `mutation($i: RefreshTokenInput!){ refreshToken(input:$i){ accessToken } }`,
    { i: { refreshToken } },
  );
  check('old refresh token revoked after rotation', reuseOld.errors?.[0]?.extensions?.code === 'INVALID_TOKEN', reuseOld.errors);

  // update profile
  const updProfile = await gql(
    `mutation($i: UpdateProfileInput!){ updateProfile(input:$i){ bio gender timezone } }`,
    { i: { bio: 'Hello world', gender: 'female', timezone: 'Europe/Moscow', name: 'Alice B' } },
    accessToken,
  );
  check('updateProfile saves fields', updProfile.data?.updateProfile?.bio === 'Hello world', updProfile.errors);

  // updateProfile unauthorized
  const updAnon = await gql(
    `mutation($i: UpdateProfileInput!){ updateProfile(input:$i){ bio } }`,
    { i: { bio: 'x' } },
  );
  check('updateProfile requires auth', updAnon.errors?.[0]?.extensions?.code === 'UNAUTHORIZED', updAnon.errors);

  // enable 2FA (returns qr)
  const enable2fa = await gql(`mutation { enableTwoFactor { qrDataUrl otpauthUrl } }`, undefined, accessToken);
  check('enableTwoFactor returns QR', (enable2fa.data?.enableTwoFactor?.qrDataUrl || '').startsWith('data:image/png'), enable2fa.errors);

  // confirm 2FA with valid TOTP code
  const speakeasy = await import('speakeasy');
  const { UserModel } = await import('./src/infrastructure/database/mongo/models.js');
  const userDoc: any = await UserModel.findOne({ email: 'alice@example.com' }).lean();
  const code = speakeasy.totp({ secret: userDoc.twoFactorSecret, encoding: 'base32' });
  const confirm2fa = await gql(`mutation($c:String!){ confirmTwoFactor(code:$c) }`, { c: code }, accessToken);
  check('confirmTwoFactor with valid code', confirm2fa.data?.confirmTwoFactor === true, confirm2fa.errors);

  // sign in now needs 2FA
  const login2 = await gql(
    `mutation($i: SignInInput!){ signIn(input:$i){ needTwoFactor twoFactorToken accessToken } }`,
    { i: { email: 'alice@example.com', password: 'password123' } },
  );
  check('signIn now needs 2FA', login2.data?.signIn?.needTwoFactor === true && !!login2.data?.signIn?.twoFactorToken, login2);

  // complete 2FA login
  const code2 = speakeasy.totp({ secret: userDoc.twoFactorSecret, encoding: 'base32' });
  const login2fa = await gql(
    `mutation($i: SignInTwoFactorInput!){ signInTwoFactor(input:$i){ accessToken user{ email } } }`,
    { i: { twoFactorToken: login2.data.signIn.twoFactorToken, code: code2 } },
  );
  check('signInTwoFactor completes login', !!login2fa.data?.signInTwoFactor?.accessToken, login2fa.errors);

  // public location queries
  const countries = await gql(`query { countries { id name regions { name cities { name } } } }`);
  check('countries query returns data', countries.data?.countries?.[0]?.name === 'Russia', countries.errors);
  check('nested regions resolve', countries.data?.countries?.[0]?.regions?.[0]?.cities?.[0]?.name === 'Moscow', countries.errors);

  // password reset flow (token captured from email-token repo)
  const reqReset = await gql(
    `mutation($i: RequestPasswordResetInput!){ requestPasswordReset(input:$i) }`,
    { i: { email: 'alice@example.com' } },
  );
  check('requestPasswordReset returns true', reqReset.data?.requestPasswordReset === true, reqReset.errors);

  console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);

  process.exitCode = failed === 0 ? 0 : 1;
}

const interrupt = (signal: NodeJS.Signals) => {
  void cleanup().finally(() => process.exit(signal === 'SIGINT' ? 130 : 143));
};
const onSigint = () => interrupt('SIGINT');
const onSigterm = () => interrupt('SIGTERM');
process.once('SIGINT', onSigint);
process.once('SIGTERM', onSigterm);

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
    await cleanup();
  });
