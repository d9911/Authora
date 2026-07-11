import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(root, 'frontend');
const sourceRoot = path.join(frontendRoot, 'src');
const requireFromFrontend = createRequire(path.join(frontendRoot, 'package.json'));
const React = requireFromFrontend('react');
const { renderToStaticMarkup } = requireFromFrontend('react-dom/server');
const { createInstance } = requireFromFrontend('i18next');
const { I18nextProvider, useTranslation } = requireFromFrontend('react-i18next');
const { i18nConfig } = await import(
  pathToFileURL(path.join(sourceRoot, 'shared/i18n/config.ts')).href
);

const optionsSource = await readFile(
  path.join(sourceRoot, 'shared/i18n/options.ts'),
  'utf8',
);
assert.match(optionsSource, /fallbackLng:\s*i18nConfig\.defaultLocale/);
assert.match(optionsSource, /parseMissingKeyHandler:\s*isProduction/);
assert.match(optionsSource, /getProductionMissingText\(locale, resources\)/);

const resources = {};
for (const locale of i18nConfig.supportedLocales) {
  resources[locale] = {
    common: JSON.parse(
      await readFile(
        path.join(sourceRoot, 'locales', locale, 'common.json'),
        'utf8',
      ),
    ),
  };
}

delete resources.en.common.home.actions.createIdentity;
const productionMissingText = resources.en.common.status.unavailable;
const instance = createInstance();
await instance.init({
  lng: 'en',
  fallbackLng: i18nConfig.defaultLocale,
  supportedLngs: [...i18nConfig.supportedLocales],
  ns: ['common'],
  defaultNS: 'common',
  resources,
  initAsync: false,
  returnNull: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
  parseMissingKeyHandler: () => productionMissingText,
});

function TranslationProbe({ translationKey }) {
  const { t } = useTranslation('common');
  return React.createElement('span', null, t(translationKey));
}

function renderTranslation(translationKey) {
  return renderToStaticMarkup(
    React.createElement(
      I18nextProvider,
      { i18n: instance },
      React.createElement(TranslationProbe, { translationKey }),
    ),
  );
}

assert.equal(
  renderTranslation('home.actions.createIdentity'),
  '<span>Создать профиль</span>',
);

const missingKey = 'test.intentionallyMissingInEveryLocale';
const missingMarkup = renderTranslation(missingKey);
assert.equal(missingMarkup, '<span>Translation unavailable</span>');
assert.doesNotMatch(missingMarkup, new RegExp(missingKey));

console.log('i18n production fallback render checks passed');
