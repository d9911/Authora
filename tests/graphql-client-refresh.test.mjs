import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const frontendSource = new URL('../frontend/src/', import.meta.url);

function existingModuleUrl(baseUrl) {
  for (const candidate of [
    baseUrl,
    new URL(`${baseUrl.href}.ts`),
    new URL(`${baseUrl.href}.tsx`),
    new URL(`${baseUrl.href.replace(/\/$/, '')}/index.ts`),
  ]) {
    if (
      candidate.protocol === 'file:' &&
      existsSync(fileURLToPath(candidate)) &&
      statSync(fileURLToPath(candidate)).isFile()
    ) {
      return candidate;
    }
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = existingModuleUrl(new URL(specifier.slice(2), frontendSource));
      if (resolved) return nextResolve(resolved.href, context);
    }

    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL?.includes('/frontend/src/')
    ) {
      const resolved = existingModuleUrl(new URL(specifier, context.parentURL));
      if (resolved) return nextResolve(resolved.href, context);
    }

    return nextResolve(specifier, context);
  },
});

const { axiosInstance } = await import('../frontend/src/shared/api/axiosInstance.ts');
const { gqlRequest } = await import('../frontend/src/shared/api/graphqlClient.ts');
const { default: authReducer } = await import(
  '../frontend/src/processes/store/slices/authSlice.ts'
);

function axiosResponse(config, data) {
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

test('concurrent unauthorized GraphQL calls perform one refresh and one retry each', async () => {
  const originalAdapter = axiosInstance.defaults.adapter;
  let refreshed = false;
  let refreshCalls = 0;
  let initialCalls = 0;
  let retryCalls = 0;

  axiosInstance.defaults.adapter = async (config) => {
    const body = JSON.parse(config.data);
    if (body.query.includes('mutation RefreshToken')) {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      refreshed = true;
      return axiosResponse(config, { data: { refreshToken: {} } });
    }

    if (!refreshed) {
      initialCalls += 1;
      return axiosResponse(config, {
        errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHORIZED' } }],
      });
    }

    retryCalls += 1;
    return axiosResponse(config, { data: { value: body.variables.value } });
  };

  try {
    const results = await Promise.all([
      gqlRequest('query Value($value: Int!) { value }', { value: 1 }),
      gqlRequest('query Value($value: Int!) { value }', { value: 2 }),
      gqlRequest('query Value($value: Int!) { value }', { value: 3 }),
    ]);

    assert.deepEqual(results, [{ value: 1 }, { value: 2 }, { value: 3 }]);
    assert.equal(initialCalls, 3);
    assert.equal(refreshCalls, 1);
    assert.equal(retryCalls, 3);
  } finally {
    axiosInstance.defaults.adapter = originalAdapter;
  }
});

test('a late bootstrap response cannot restore the user after logout', () => {
  const requestId = 'bootstrap-before-logout';
  let state = authReducer(undefined, {
    type: 'auth/loadMe/pending',
    meta: { requestId },
  });
  state = authReducer(state, { type: 'auth/logout/pending', meta: { requestId: 'logout' } });
  state = authReducer(state, {
    type: 'auth/logout/fulfilled',
    payload: true,
    meta: { requestId: 'logout' },
  });
  state = authReducer(state, {
    type: 'auth/loadMe/fulfilled',
    payload: { id: 'stale-user', email: 'stale@example.com' },
    meta: { requestId },
  });

  assert.equal(state.status, 'guest');
  assert.equal(state.user, null);
});
