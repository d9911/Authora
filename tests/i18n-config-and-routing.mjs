import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const configUrl = new URL('../frontend/src/shared/i18n/config.ts', import.meta.url);

assert.ok(existsSync(configUrl), 'shared/i18n/config.ts must define the locale contract');

const {
  detectPreferredLocale,
  getLocaleFromPathname,
  i18nConfig,
  isSupportedLocale,
  localizePath,
  normalizeLocale,
  preserveUrlHash,
  replaceLocaleInUrl,
  stripLocaleFromPathname,
} = await import(configUrl.href);

assert.equal(i18nConfig.defaultLocale, 'ru');
assert.ok(i18nConfig.supportedLocales.includes('ru'));
assert.ok(i18nConfig.supportedLocales.includes('en'));
assert.equal(new Set(i18nConfig.supportedLocales).size, i18nConfig.supportedLocales.length);

assert.equal(isSupportedLocale('ru'), true);
assert.equal(isSupportedLocale('en'), true);
assert.equal(isSupportedLocale('zz'), false);
assert.equal(isSupportedLocale('EN'), false);

assert.equal(normalizeLocale('RU_ru'), 'ru');
assert.equal(normalizeLocale('en-US'), 'en');
assert.equal(normalizeLocale('zz-ZZ'), null);
assert.equal(normalizeLocale(null), null);

assert.equal(getLocaleFromPathname('/ru/sign-in'), 'ru');
assert.equal(getLocaleFromPathname('/en'), 'en');
assert.equal(getLocaleFromPathname('/sign-in'), null);
assert.equal(getLocaleFromPathname('/zz/sign-in'), null);

assert.equal(stripLocaleFromPathname('/ru/sign-in'), '/sign-in');
assert.equal(stripLocaleFromPathname('/ru/sign-in/'), '/sign-in');
assert.equal(stripLocaleFromPathname('/en/'), '/');
assert.equal(stripLocaleFromPathname('/sign-in'), '/sign-in');

assert.equal(localizePath('/', 'ru'), '/ru/');
assert.equal(localizePath('/sign-in', 'en'), '/en/sign-in');
assert.equal(localizePath('/sign-in/', 'en'), '/en/sign-in');
assert.equal(
  localizePath('/reset-password?token=123#form', 'ru'),
  '/ru/reset-password?token=123#form',
);
assert.equal(localizePath('/ru/profile/edit?tab=security', 'en'), '/en/profile/edit?tab=security');
assert.equal(
  replaceLocaleInUrl('/ru/reset-password?token=123#form', 'en'),
  '/en/reset-password?token=123#form',
);
assert.equal(preserveUrlHash('/ru/profile/edit?tab=security', '#photos'), '/ru/profile/edit?tab=security#photos');
assert.equal(preserveUrlHash('/ru/profile/edit#bio', '#photos'), '/ru/profile/edit#bio');

assert.equal(
  detectPreferredLocale({ storedLocale: 'en', acceptLanguage: 'ru-RU,ru;q=0.9' }),
  'en',
);
assert.equal(
  detectPreferredLocale({ storedLocale: 'zz', acceptLanguage: 'en-US;q=0.8,ru;q=0.7' }),
  'en',
);
assert.equal(
  detectPreferredLocale({ storedLocale: null, acceptLanguage: 'zz;q=1,ru;q=0.4,en;q=0.9' }),
  'en',
);
assert.equal(detectPreferredLocale({ storedLocale: null, acceptLanguage: 'zz-ZZ' }), 'ru');
assert.equal(
  detectPreferredLocale({ storedLocale: null, acceptLanguage: 'en;q=0' }),
  'ru',
);
assert.equal(
  detectPreferredLocale({ storedLocale: null, acceptLanguage: 'en;Q=0.8,ru;q=0.7' }),
  'en',
);
assert.equal(
  detectPreferredLocale({ storedLocale: null, acceptLanguage: 'en;q=1.5,ru;q=0.7' }),
  'ru',
);
assert.equal(
  detectPreferredLocale({ storedLocale: null, acceptLanguage: 'en;q=invalid,ru;q=0.7' }),
  'ru',
);
assert.equal(
  detectPreferredLocale({ storedLocale: null, acceptLanguage: '*;q=1,en;q=0' }),
  'ru',
);

console.log('i18n config and routing tests passed');
