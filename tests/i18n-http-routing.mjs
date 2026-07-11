import assert from 'node:assert/strict';

const baseUrl = process.env.I18N_BASE_URL ?? 'http://127.0.0.1:5178';

async function request(path, headers = {}) {
  return fetch(new URL(path, baseUrl), {
    headers,
    redirect: 'manual',
  });
}

const rootRedirect = await request('/', {
  'accept-language': 'zz-ZZ',
});
assert.equal(rootRedirect.status, 307);
assert.equal(rootRedirect.headers.get('location'), '/ru/');

const localeRootWithoutSlash = await request('/ru');
assert.equal(localeRootWithoutSlash.status, 307);
assert.equal(localeRootWithoutSlash.headers.get('location'), '/ru/');

const nestedTrailingSlash = await request('/ru/sign-in/?source=slash');
assert.equal(nestedTrailingSlash.status, 307);
assert.equal(
  nestedTrailingSlash.headers.get('location'),
  '/ru/sign-in?source=slash',
);

const browserEnglish = await request('/sign-in', {
  'accept-language': 'en-US,en;q=0.9',
});
assert.equal(browserEnglish.status, 307);
assert.equal(browserEnglish.headers.get('location'), '/en/sign-in');

const defaultLocale = await request('/sign-in', {
  'accept-language': 'zz-ZZ',
});
assert.equal(defaultLocale.status, 307);
assert.equal(defaultLocale.headers.get('location'), '/ru/sign-in');

const storedLocale = await request('/reset-password?token=123', {
  cookie: 'authora_locale=ru',
  'accept-language': 'en-US',
});
assert.equal(storedLocale.status, 307);
assert.equal(storedLocale.headers.get('location'), '/ru/reset-password?token=123');

const protectedRoute = await request('/ru/profile/edit?tab=security');
assert.equal(protectedRoute.status, 307);
assert.equal(
  protectedRoute.headers.get('location'),
  '/ru/sign-in?next=%2Fru%2Fprofile%2Fedit%3Ftab%3Dsecurity',
);

const ruSignIn = await request('/ru/sign-in');
assert.equal(ruSignIn.status, 200);
const ruHtml = await ruSignIn.text();
assert.match(ruHtml, /<html[^>]+lang="ru"/);
assert.match(ruHtml, /<title>Вход \| Authora<\/title>/);

const enSignIn = await request('/en/sign-in');
assert.equal(enSignIn.status, 200);
const enHtml = await enSignIn.text();
assert.match(enHtml, /<html[^>]+lang="en"/);
assert.match(enHtml, /<title>Sign in \| Authora<\/title>/);

const localizedNotFound = await request('/ru/no-such-page');
assert.equal(localizedNotFound.status, 200);
const notFoundHtml = await localizedNotFound.text();
assert.match(notFoundHtml, /<html[^>]+lang="ru"/);
assert.match(notFoundHtml, /Страница не найдена/);
assert.match(notFoundHtml, /NEXT_HTTP_ERROR_FALLBACK;404/);
assert.match(notFoundHtml, /<meta name="robots" content="noindex"/);

const unsupportedLocale = await request('/zz/sign-in?next=%2Faccount', {
  'accept-language': 'ru-RU',
});
assert.equal(unsupportedLocale.status, 307);
assert.equal(
  unsupportedLocale.headers.get('location'),
  '/ru/sign-in?next=%2Faccount',
);
assert.match(
  unsupportedLocale.headers.get('set-cookie') ?? '',
  /authora_locale=ru/,
);

const caseVariantLocale = await request('/EN/sign-in', {
  'accept-language': 'en-US',
});
assert.equal(caseVariantLocale.status, 307);
assert.equal(caseVariantLocale.headers.get('location'), '/en/sign-in');

const unsupportedUnknown = await request('/es/no-such-page', {
  'accept-language': 'ru-RU',
});
assert.equal(unsupportedUnknown.status, 307);
assert.equal(unsupportedUnknown.headers.get('location'), '/ru/no-such-page');

const api = await request('/api/graphql');
assert.equal(api.status, 405);
assert.equal(api.headers.get('location'), null);

const privateApi = await request('/api/private/session');
assert.equal(privateApi.status, 401);
assert.equal(privateApi.headers.get('location'), null);
assert.deepEqual(await privateApi.json(), {
  message: 'Unauthorized',
  code: 'UNAUTHORIZED',
});

const manifest = await request('/manifest.json');
assert.equal(manifest.status, 200);
assert.equal(manifest.headers.get('location'), null);

console.log(`i18n HTTP routing integration checks passed (${baseUrl})`);
