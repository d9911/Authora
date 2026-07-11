/**
 * autocannon throughput benchmark (a k6-like HTTP load tool, Node-native).
 *
 *   node tests/load/autocannon-bench.mjs
 *
 * Benchmarks two representative GraphQL operations:
 *   1) public read  (countries)        — unauthenticated, cache-friendly
 *   2) authenticated me query          — Bearer token hot path
 *
 * Requires autocannon to be installed in backend dependencies.
 */
import { createRequire } from 'node:module';

const backendRequire = createRequire(new URL('../../backend/package.json', import.meta.url));

function loadAutocannon() {
  try {
    return backendRequire('autocannon');
  } catch (error) {
    throw new Error(
      'autocannon is not installed. Install it with: cd backend && yarn add --dev autocannon@7',
      { cause: error },
    );
  }
}

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3010';
const GQL = `${BASE}/graphql`;
const sharedDuration = process.env.DURATION;
const durationText =
  process.env.AUTOCANNON_DURATION ??
  (sharedDuration && /^\d+(?:\.\d+)?$/.test(sharedDuration) ? sharedDuration : '10');
const DURATION = Number(durationText);
const CONNECTIONS = Number(process.env.CONNECTIONS || 50);
const REQUEST_TIMEOUT_MS = Number(process.env.LOAD_REQUEST_TIMEOUT_MS || 10_000);

function requirePositiveNumber(name, value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function getToken() {
  const email = `bench_${Date.now()}@example.com`;
  const res = await fetchWithTimeout(GQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: `mutation($i: SignUpInput!){ signUp(input:$i){ accessToken } }`,
      variables: { i: { email, password: 'password123', name: 'Bench' } },
    }),
  });
  if (!res.ok) throw new Error(`token request failed with HTTP ${res.status}`);
  const json = await res.json();
  const token = json?.data?.signUp?.accessToken;
  if (!token) {
    throw new Error(`could not obtain auth token: ${json?.errors?.[0]?.message || 'missing token'}`);
  }
  return token;
}

function run(autocannon, title, opts) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== ${title} ===`);
    let settled = false;
    let hardTimeout;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimeout);
      if (error) reject(error);
      else resolve();
    };
    const instance = autocannon(
      { url: GQL, connections: CONNECTIONS, duration: DURATION, ...opts },
      (err, result) => {
        if (err) return finish(new Error(`${title} failed: ${err.message}`, { cause: err }));
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
        const errors = Number(result.errors || 0);
        const timeouts = Number(result.timeouts || 0);
        const non2xx = Number(result.non2xx || 0);
        const total = Number(result.requests?.total || 0);
        if (total === 0 || errors > 0 || timeouts > 0 || non2xx > 0) {
          return finish(
            new Error(
              `${title} failed: total=${total}, errors=${errors}, timeouts=${timeouts}, non2xx=${non2xx}`,
            ),
          );
        }
        finish();
      },
    );
    hardTimeout = setTimeout(() => {
      instance.stop?.();
      finish(new Error(`${title} timed out after ${DURATION * 1000 + 30_000}ms`));
    }, DURATION * 1000 + 30_000);
    if (settled) clearTimeout(hardTimeout);
    autocannon.track(instance, { renderProgressBar: false });
  });
}

async function main() {
  requirePositiveNumber('DURATION', DURATION);
  requirePositiveNumber('CONNECTIONS', CONNECTIONS);
  requirePositiveNumber('LOAD_REQUEST_TIMEOUT_MS', REQUEST_TIMEOUT_MS);
  const autocannon = loadAutocannon();

  // sanity: backend reachable?
  const health = await fetchWithTimeout(`${BASE}/health`);
  if (!health.ok) throw new Error(`backend health check returned HTTP ${health.status} at ${BASE}`);

  await run(autocannon, 'Public read: countries', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: `query { countries { id name } }` }),
  });

  const token = await getToken();
  await run(autocannon, 'Authenticated: me', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: `query { me { id email } }` }),
  });
}

main().catch((error) => {
  console.error(`[bench] ${error.message}`);
  process.exitCode = 1;
});
