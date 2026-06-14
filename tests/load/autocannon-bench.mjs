/**
 * autocannon throughput benchmark (a k6-like HTTP load tool, Node-native).
 *
 *   node tests/load/autocannon-bench.mjs
 *
 * Benchmarks two representative GraphQL operations:
 *   1) public read  (countries)        — unauthenticated, cache-friendly
 *   2) authenticated me query          — Bearer token hot path
 *
 * Installs autocannon on demand if missing.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function ensureAutocannon() {
  try {
    return require('autocannon');
  } catch {
    console.log('[bench] installing autocannon…');
    spawnSync('npm', ['install', '--no-save', 'autocannon@7'], {
      cwd: new URL('../../backend/', import.meta.url).pathname,
      stdio: 'inherit',
    });
    const r = createRequire(new URL('../../backend/package.json', import.meta.url));
    return r('autocannon');
  }
}

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3010';
const GQL = `${BASE}/graphql`;
const DURATION = Number(process.env.DURATION || 10);
const CONNECTIONS = Number(process.env.CONNECTIONS || 50);

async function getToken() {
  const email = `bench_${Date.now()}@example.com`;
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: `mutation($i: SignUpInput!){ signUp(input:$i){ accessToken } }`,
      variables: { i: { email, password: 'password123', name: 'Bench' } },
    }),
  });
  const json = await res.json();
  return json?.data?.signUp?.accessToken;
}

function run(title, opts) {
  const autocannon = ensureAutocannon();
  return new Promise((resolve) => {
    console.log(`\n=== ${title} ===`);
    const instance = autocannon(
      { url: GQL, connections: CONNECTIONS, duration: DURATION, ...opts },
      (err, result) => {
        if (err) {
          console.error(err);
          return resolve();
        }
        console.log(
          `  req/s   avg=${result.requests.average.toFixed(0)} ` +
            `stddev=${result.requests.stddev.toFixed(0)}`,
        );
        console.log(
          `  latency p50=${result.latency.p50}ms p97_5=${result.latency.p97_5}ms ` +
            `max=${result.latency.max}ms`,
        );
        console.log(
          `  total=${result.requests.total} 2xx=${result['2xx']} non2xx=${result.non2xx} ` +
            `errors=${result.errors} timeouts=${result.timeouts}`,
        );
        resolve();
      },
    );
    autocannon.track(instance, { renderProgressBar: false });
  });
}

async function main() {
  // sanity: backend reachable?
  try {
    const h = await fetch(`${BASE}/health`);
    if (!h.ok) throw new Error('health not ok');
  } catch {
    console.error(`[bench] backend not reachable at ${BASE}. Start it first.`);
    process.exit(1);
  }

  await run('Public read: countries', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: `query { countries { id name } }` }),
  });

  const token = await getToken();
  if (token) {
    await run('Authenticated: me', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: `query { me { id email } }` }),
    });
  } else {
    console.log('\n[bench] could not obtain token (rate limited?) — skipping authed bench');
  }
}

main();
