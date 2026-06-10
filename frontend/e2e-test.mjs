/**
 * End-to-end test: boots in-memory Mongo, the backend, and the built Next.js
 * server, then drives the real proxy (/api/graphql) like a browser would,
 * including httpOnly cookie handling.
 */
import { spawn } from 'node:child_process';
import { MongoMemoryServer } from '../backend/node_modules/mongodb-memory-server/index.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 400 || r.status === 405) return true;
    } catch {}
    await sleep(500);
  }
  throw new Error(`timeout waiting for ${url}`);
}

let mongod, backend, frontend;
const cleanup = async () => {
  try { backend?.kill('SIGKILL'); } catch {}
  try { frontend?.kill('SIGKILL'); } catch {}
  try { await mongod?.stop(); } catch {}
};

async function main() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Start backend (compiled dist) on 3010
  backend = spawn('node', ['dist/app/server.js'], {
    cwd: '../backend',
    env: {
      ...process.env,
      MONGO_URI: uri,
      DB_TYPE: 'mongo',
      BACKEND_PORT: '3010',
      JWT_ACCESS_SECRET: 'e2e_access',
      JWT_REFRESH_SECRET: 'e2e_refresh',
      JWT_ACCESS_EXPIRES: '15m',
      JWT_REFRESH_EXPIRES: '30d',
      NODE_ENV: 'production',
    },
    stdio: 'ignore',
  });
  await waitFor('http://localhost:3010/health');

  // Seed a country via backend models (reuse backend mongoose)
  {
    const mongoose = (await import('../backend/node_modules/mongoose/index.js')).default;
    await mongoose.connect(uri);
    const Country = mongoose.model('Country', new mongoose.Schema({ name: String, code: String }, { timestamps: true }));
    await Country.create({ name: 'Russia', code: 'RU' });
    await mongoose.disconnect();
  }

  // Start frontend (built) on 5178
  frontend = spawn('npx', ['next', 'start', '-p', '5178'], {
    cwd: '.',
    env: { ...process.env, BACKEND_INTERNAL_URL: 'http://localhost:3010', NODE_ENV: 'production' },
    stdio: 'ignore',
  });
  await waitFor('http://localhost:5178/');

  const base = 'http://localhost:5178';
  let cookies = '';
  const captureCookies = (res) => {
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(';');
      const [name] = pair.split('=');
      // replace or add
      const others = cookies.split('; ').filter((x) => x && !x.startsWith(name + '='));
      if (!pair.endsWith('=')) others.push(pair);
      cookies = others.join('; ');
    }
  };
  const gql = async (query, variables) => {
    const res = await fetch(`${base}/api/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookies ? { cookie: cookies } : {}) },
      body: JSON.stringify({ query, variables }),
    });
    captureCookies(res);
    return { json: await res.json(), res };
  };

  let pass = 0, fail = 0;
  const check = (name, cond, extra) => {
    if (cond) { pass++; console.log('  ✓', name); }
    else { fail++; console.log('  ✗', name, extra ? JSON.stringify(extra) : ''); }
  };

  // public page renders countries (SSR through serverGql)
  const countryPage = await (await fetch(`${base}/country`)).text();
  check('public /country page renders seeded country', countryPage.includes('Russia'));

  // sign up through proxy -> sets httpOnly cookies, strips tokens from body
  const su = await gql(
    `mutation($i: SignUpInput!){ signUp(input:$i){ accessToken refreshToken needTwoFactor user{ id email } } }`,
    { i: { email: 'e2e@example.com', password: 'password123', name: 'E2E' } },
  );
  check('signUp returns user', su.json.data?.signUp?.user?.email === 'e2e@example.com', su.json.errors);
  check('proxy strips accessToken from body', su.json.data?.signUp?.accessToken == null);
  check('proxy set access_token cookie', cookies.includes('access_token='));
  check('proxy set refresh_token cookie', cookies.includes('refresh_token='));

  // me through proxy uses cookie-injected bearer token
  const me = await gql(`query { me { email } }`);
  check('me works via cookie auth', me.json.data?.me?.email === 'e2e@example.com', me.json.errors);

  // update profile (protected)
  const up = await gql(
    `mutation($i: UpdateProfileInput!){ updateProfile(input:$i){ bio timezone } }`,
    { i: { bio: 'from e2e', timezone: 'Europe/Moscow' } },
  );
  check('updateProfile persists via proxy', up.json.data?.updateProfile?.bio === 'from e2e', up.json.errors);

  // refresh: proxy injects refresh cookie into the mutation
  const rf = await gql(`mutation($input: RefreshTokenInput!){ refreshToken(input:$input){ accessToken refreshToken needTwoFactor } }`, { input: {} });
  check('refresh via injected cookie works', rf.json.data?.refreshToken?.needTwoFactor === false, rf.json.errors);

  // middleware: unauthenticated private page redirects to /login
  const noAuthRes = await fetch(`${base}/profile/edit`, { redirect: 'manual' });
  check('middleware redirects guests from /profile', noAuthRes.status === 307 || noAuthRes.status === 308, { status: noAuthRes.status });

  // logout clears cookies
  const lo = await gql(`mutation { logout }`);
  check('logout returns true', lo.json.data?.logout === true, lo.json.errors);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed\n`);
  await cleanup();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); await cleanup(); process.exit(1); });
