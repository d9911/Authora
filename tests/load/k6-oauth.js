// k6 functional test for GitHub + Telegram auth flows (login & linking).
//
//   k6 run tests/load/k6-oauth.js
//
// Verifies the OAuth/bot endpoints behave correctly without needing real
// GitHub/Telegram credentials: redirect shape, CSRF state, signature rejection,
// link gating, and the Telegram bot deep-link ticket lifecycle.
import http from 'k6/http';
import { check, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3010';
const GQL = `${BASE_URL}/graphql`;

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: { checks: ['rate>0.95'] },
};

function gql(query, variables, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return http.post(GQL, JSON.stringify({ query, variables }), { headers });
}

export default function () {
  // --- a real user to test linking against ---
  const email = `oauth_${Date.now()}@example.com`;
  const su = gql(
    `mutation($i: SignUpInput!){ signUp(input:$i){ accessToken } }`,
    { i: { email, password: 'password123', name: 'OAuth' } },
  );
  const access = su.json('data.signUp.accessToken');

  group('GitHub: authorize redirects to github.com', () => {
    const res = http.get(`${BASE_URL}/api/auth/github`, { redirects: 0 });
    // 302 to github.com when configured, or 302 back to /sign-in?error=github_not_configured
    const loc = res.headers['Location'] || res.headers['location'] || '';
    check(res, {
      'github authorize 302': (r) => r.status === 302,
      'github redirect is github.com or not_configured': () =>
        loc.includes('github.com/login/oauth/authorize') ||
        loc.includes('error=github_not_configured'),
    });
  });

  group('GitHub: callback rejects bad state', () => {
    const res = http.get(`${BASE_URL}/api/auth/github/callback?code=x&state=bad`, {
      redirects: 0,
    });
    const loc = res.headers['Location'] || res.headers['location'] || '';
    check(res, {
      'callback 302': (r) => r.status === 302,
      'callback rejects (state or not_configured)': () =>
        loc.includes('error=github_state') || loc.includes('error=github_not_configured'),
    });
  });

  group('Telegram: callback rejects bad signature', () => {
    const res = http.get(
      `${BASE_URL}/api/auth/telegram/callback?id=1&hash=deadbeef&auth_date=1`,
      { redirects: 0 },
    );
    const loc = res.headers['Location'] || res.headers['location'] || '';
    check(res, {
      'tg callback 302': (r) => r.status === 302,
      'tg rejects (signature or not_configured)': () =>
        loc.includes('error=telegram_signature') ||
        loc.includes('error=telegram_not_configured'),
    });
  });

  group('Telegram bot: start + poll lifecycle', () => {
    const start = gql(`mutation { telegramBotStart { token botUrl } }`);
    const token = start.json('data.telegramBotStart.token');
    const botUrl = start.json('data.telegramBotStart.botUrl');
    check(start, {
      'bot start returns token': () => typeof token === 'string' && token.length > 5,
      'bot url has ?start= or empty(not configured)': () =>
        botUrl === '' || botUrl.includes(`start=${token}`),
    });
    if (token) {
      const poll = gql(`mutation($t:String!){ telegramBotPoll(token:$t){ status } }`, { t: token });
      check(poll, {
        'poll pending before tap': () => poll.json('data.telegramBotPoll.status') === 'pending',
      });
    }
    // unknown ticket -> expired
    const bad = gql(`mutation($t:String!){ telegramBotPoll(token:$t){ status } }`, {
      t: 'does-not-exist',
    });
    check(bad, {
      'unknown ticket -> expired': () => bad.json('data.telegramBotPoll.status') === 'expired',
    });
  });

  group('Linking requires auth', () => {
    const anon = gql(`mutation { oauthLinkToken }`);
    check(anon, {
      'oauthLinkToken denies anonymous': () => {
        try {
          return anon.json('errors.0.extensions.code') === 'UNAUTHORIZED';
        } catch (_e) {
          return false;
        }
      },
    });
    if (access) {
      const authed = gql(`mutation { oauthLinkToken }`, {}, access);
      check(authed, {
        'oauthLinkToken works when authed': () => !!authed.json('data.oauthLinkToken'),
      });
      const tgLink = gql(`mutation { telegramBotStart(link:true){ token } }`, {}, access);
      check(tgLink, {
        'telegram link start works when authed': () =>
          !!tgLink.json('data.telegramBotStart.token'),
      });
    }
  });
}
