import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const moduleUrl = new URL('../frontend/src/shared/i18n/metadata.ts', import.meta.url);
assert.ok(existsSync(moduleUrl), 'i18n metadata helper must exist');

const source = readFileSync(moduleUrl, 'utf8');
assert.match(source, /productionOrigin\s*=\s*'https:\/\/www\.auth\.d9911'/);
assert.match(source, /i18nConfig\.supportedLocales\.map/);
assert.match(source, /languages\['x-default'\]/);
assert.match(source, /localizePath\(pathname, locale\)/);
assert.doesNotMatch(source, /canonicalPath/);

const configUrl = new URL('../frontend/src/shared/i18n/config.ts', import.meta.url);
const { i18nConfig, localizePath } = await import(configUrl.href);
const absolute = (locale) =>
  new URL(localizePath('/sign-in', locale), 'https://www.auth.d9911').toString();
assert.equal(absolute('ru'), 'https://www.auth.d9911/ru/sign-in');
assert.equal(absolute('en'), 'https://www.auth.d9911/en/sign-in');
assert.equal(
  new URL(localizePath('/', 'ru'), 'https://www.auth.d9911').toString(),
  'https://www.auth.d9911/ru/',
);
assert.ok(i18nConfig.supportedLocales.includes('ru'));
assert.ok(i18nConfig.supportedLocales.includes('en'));

console.log('i18n metadata tests passed');
