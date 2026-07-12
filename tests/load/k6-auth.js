// k6 functional + load test for Authora's GraphQL auth API.
//
//   k6 run tests/load/k6-auth.js
//   BASE_URL=http://localhost:3010 VUS=20 DURATION=30s k6 run tests/load/k6-auth.js
//
// Targets the backend GraphQL endpoint directly (no proxy) so we can drive auth
// flows with explicit Bearer tokens and measure server behaviour under load.
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3010';
const GQL = `${BASE_URL}/graphql`;

const errors = new Counter('gql_errors');
const signupTrend = new Trend('signup_duration', true);
const localVus = Number(__ENV.VUS || 5);

export const options = {
  scenarios: {
    // 1) public read traffic (countries) — should be fast and cache-friendly
    public_reads: {
      executor: 'constant-vus',
      exec: 'publicReads',
      vus: localVus,
      duration: __ENV.DURATION || '20s',
      tags: { scenario: 'public_reads' },
    },
    // 2) full auth lifecycle per VU iteration (ramping)
    auth_flow: {
      executor: 'ramping-vus',
      exec: 'authFlow',
      startVUs: 0,
      stages: [
        { duration: '10s', target: localVus },
        { duration: '15s', target: localVus },
        { duration: '5s', target: 0 },
      ],
      tags: { scenario: 'auth_flow' },
      startTime: '0s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1% transport failures
    // Sign-up is intentionally bcrypt-bound (~600ms by design), so it is
    // measured separately. Fast paths (me, countries, profile) must stay snappy.
    'http_req_duration{scenario:public_reads}': ['p(95)<300'],
    'signup_duration': ['p(95)<2000'],
    gql_errors: ['count<50'],
    checks: ['rate>0.99'],
  },
};

function gql(query, variables, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return http.post(GQL, JSON.stringify({ query, variables }), { headers });
}

export function publicReads() {
  const res = gql(`query { countries { id name regions { id name } } }`);
  check(res, {
    'countries 200': (r) => r.status === 200,
    'countries has data': (r) => {
      try {
        return Array.isArray(r.json('data.countries'));
      } catch (_e) {
        return false;
      }
    },
  });
  sleep(1);
}

export function authFlow() {
  const uniq = `${__VU}-${__ITER}-${Date.now()}`;
  const email = `load_${uniq}@example.com`;
  let access = null;
  let refresh = null;

  group('signUp', () => {
    const res = gql(
      `mutation($i: SignUpInput!){ signUp(input:$i){ accessToken refreshToken user{ id email emailVerified } } }`,
      { i: { email, password: 'password123', name: 'Load Test' } },
    );
    signupTrend.add(res.timings.duration);
    const ok = check(res, {
      'signUp 200': (r) => r.status === 200,
      'signUp returns token': (r) => {
        try {
          return !!r.json('data.signUp.accessToken');
        } catch (_e) {
          return false;
        }
      },
    });
    if (!ok) errors.add(1);
    try {
      access = res.json('data.signUp.accessToken');
      refresh = res.json('data.signUp.refreshToken');
    } catch (_e) {
      /* ignore */
    }
  });

  if (access) {
    group('me', () => {
      const res = gql(`query { me { id email } }`, {}, access);
      check(res, {
        'me 200': (r) => r.status === 200,
        'me matches email': (r) => {
          try {
            return r.json('data.me.email') === email;
          } catch (_e) {
            return false;
          }
        },
      });
    });

    group('updateProfile', () => {
      const res = gql(
        `mutation($i: UpdateProfileInput!){ updateProfile(input:$i){ bio timezone } }`,
        { i: { bio: 'load', timezone: 'Europe/Moscow' } },
        access,
      );
      check(res, { 'updateProfile 200': (r) => r.status === 200 });
    });
  }

  if (refresh) {
    group('refresh', () => {
      const res = gql(
        `mutation($i: RefreshTokenInput!){ refreshToken(input:$i){ accessToken } }`,
        { i: { refreshToken: refresh } },
      );
      check(res, {
        'refresh issues new token': (r) => {
          try {
            return !!r.json('data.refreshToken.accessToken');
          } catch (_e) {
            return false;
          }
        },
      });
    });
  }

  sleep(1);
}
