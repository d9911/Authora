import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  blockRefreshForLogout,
  refreshTokenKey,
  runRefreshSingleFlight,
} from '../frontend/src/shared/api/serverRefreshCoordinator.ts';

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('deduplicates concurrent proactive refreshes and forgets completed work', async () => {
  let resolveRefresh;
  let calls = 0;
  const firstResult = { accessToken: 'access-1', refreshToken: 'refresh-1' };
  const refresh = () => {
    calls += 1;
    return new Promise((resolve) => {
      resolveRefresh = resolve;
    });
  };

  const key = refreshTokenKey('raw-refresh-token');
  assert.notEqual(key, 'raw-refresh-token');

  const first = runRefreshSingleFlight(key, refresh);
  const second = runRefreshSingleFlight(key, refresh);
  assert.equal(calls, 1);
  resolveRefresh(firstResult);
  assert.deepEqual(await Promise.all([first, second]), [firstResult, firstResult]);

  const nextResult = { accessToken: 'access-2', refreshToken: 'refresh-2' };
  const third = runRefreshSingleFlight(key, async () => {
    calls += 1;
    return nextResult;
  });
  assert.deepEqual(await third, nextResult);
  assert.equal(calls, 2);
});

test('cleans up a rejected refresh so a later attempt can run', async () => {
  const key = refreshTokenKey('rejected-refresh-token');
  let calls = 0;

  await assert.rejects(
    runRefreshSingleFlight(key, async () => {
      calls += 1;
      throw new Error('expired');
    }),
    /expired/,
  );

  assert.equal(
    await runRefreshSingleFlight(key, async () => {
      calls += 1;
      return true;
    }),
    true,
  );
  assert.equal(calls, 2);
});

test('logout blocks an in-flight refresh and returns the rotated token for revocation', async () => {
  let resolveRefresh;
  let calls = 0;
  const key = refreshTokenKey('refresh-before-logout');
  const refresh = runRefreshSingleFlight(key, () => {
    calls += 1;
    return new Promise((resolve) => {
      resolveRefresh = resolve;
    });
  });
  const logout = blockRefreshForLogout(key);

  resolveRefresh({ accessToken: 'rotated-access', refreshToken: 'rotated-refresh' });
  assert.equal(await refresh, null);
  assert.equal(await logout, 'rotated-refresh');
  assert.equal(await runRefreshSingleFlight(key, async () => ++calls), null);
  assert.equal(calls, 1);
});

test('browser 401 recovery shares one refresh promise and retries only once', () => {
  const graphqlClient = read('frontend/src/shared/api/graphqlClient.ts');

  assert.match(graphqlClient, /let refreshing: Promise<boolean> \| null = null/);
  assert.match(graphqlClient, /if \(!refreshing\)/);
  assert.match(graphqlClient, /return refreshing/);
  assert.match(graphqlClient, /if \(ok\) return gqlRequest<T>\(query, variables, \{ retry: false \}\)/);
});

test('session bootstrap and selectors expose the requested auth state', () => {
  const rootLayout = read('frontend/src/app/[locale]/layout.tsx');
  const bootstrap = read('frontend/src/processes/store/AuthBootstrap.tsx');
  const authSlice = read('frontend/src/processes/store/slices/authSlice.ts');

  assert.match(rootLayout, /<AuthBootstrap\s*\/>/);
  assert.match(bootstrap, /status === 'idle'/);
  assert.match(bootstrap, /dispatch\(loadMeThunk\(\)\)/);
  assert.match(authSlice, /selectIsAuthenticated/);
  assert.match(authSlice, /selectAuthIsLoading/);
  assert.match(authSlice, /currentLoadMeRequestId/);
  assert.match(authSlice, /action\.meta\.requestId/);
  assert.match(authSlice, /logoutThunk\.pending[\s\S]*currentLoadMeRequestId = null/);
  assert.match(authSlice, /loadMeThunk\.rejected[\s\S]*state\.user = null/);
});

test('logout route clears local state and the proxy always expires session cookies', () => {
  const routes = read('frontend/src/shared/lib/routes.ts');
  const logoutPage = read('frontend/src/app/[locale]/(auth)/logout/page.tsx');
  const logoutAction = read('frontend/src/features/LogoutAction/LogoutAction.tsx');
  const authApi = read('frontend/src/features/auth-api/authApi.ts');
  const authSlice = read('frontend/src/processes/store/slices/authSlice.ts');
  const requestHandler = read('frontend/src/shared/api/requestHandler.ts');

  assert.match(routes, /logout:\s*'\/logout'/);
  assert.match(logoutPage, /<LogoutAction\s*\/>/);
  assert.match(logoutAction, /dispatch\(logoutThunk\(\)\)/);
  assert.match(logoutAction, /router\.replace\(routes\.home\)/);
  assert.match(authApi, /mutation Logout\(\$refreshToken: String\)/);
  assert.match(authApi, /logout\(refreshToken: \$refreshToken\)/);
  assert.match(authSlice, /logoutThunk\.rejected[\s\S]*state\.user = null/);
  assert.match(requestHandler, /const logoutRequested = isOperation\(query, 'logout'\)/);
  assert.match(requestHandler, /if \(logoutRequested\)[\s\S]*clearAuthCookies/);
});

test('route policy remains centralized and next destinations stay same-origin', () => {
  const proxy = read('frontend/src/proxy.ts');
  const routes = read('frontend/src/shared/lib/routes.ts');

  assert.match(proxy, /PRIVATE_PREFIXES/);
  assert.match(proxy, /AUTH_PAGES/);
  assert.match(proxy, /encodeURIComponent\(pathname \+ search\)/);
  assert.match(routes, /value\.startsWith\('\/\/'\)/);
  assert.match(routes, /url\.origin !== APP_ORIGIN/);
});
