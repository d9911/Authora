import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(root, 'frontend');
const configUrl = pathToFileURL(
  path.join(frontendRoot, 'src/shared/i18n/config.ts'),
);
const { i18nConfig } = await import(configUrl.href);
const requireFromFrontend = createRequire(
  path.join(frontendRoot, 'package.json'),
);
const { createInstance } = requireFromFrontend('i18next');

const pluralSuffixPattern = /_(zero|one|two|few|many|other)$/;
const interpolationPattern = /{{\s*([^},\s]+)[^}]*}}/g;
const richTagPattern = /<\/?([A-Za-z][\w-]*)\b[^>]*>/g;

function flatten(value, prefix = '', output = new Map()) {
  assert.ok(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    `Locale node ${prefix || '<root>'} must be an object`,
  );

  for (const [key, child] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') {
      assert.notEqual(child.trim(), '', `Translation ${fullKey} must not be empty`);
      output.set(fullKey, child);
      continue;
    }
    assert.ok(
      typeof child === 'object' && child !== null && !Array.isArray(child),
      `Translation ${fullKey} must be a string or object`,
    );
    flatten(child, fullKey, output);
  }

  return output;
}

function logicalKey(key) {
  return key.replace(pluralSuffixPattern, '_*');
}

function captures(value, pattern) {
  return [...value.matchAll(pattern)].map((match) => match[1]).sort();
}

function representativeValues(flattened, key) {
  return [...flattened.entries()]
    .filter(([candidate]) => logicalKey(candidate) === key)
    .map(([, value]) => value);
}

const resources = {};
for (const locale of i18nConfig.supportedLocales) {
  resources[locale] = {};
  for (const namespace of i18nConfig.namespaces) {
    const filename = path.join(
      frontendRoot,
      'src/locales',
      locale,
      `${namespace}.json`,
    );
    const parsed = JSON.parse(await readFile(filename, 'utf8'));
    resources[locale][namespace] = parsed;
  }
}

const referenceLocale = i18nConfig.defaultLocale;
const comparisonLocales = i18nConfig.supportedLocales.filter(
  (locale) => locale !== referenceLocale,
);

for (const namespace of i18nConfig.namespaces) {
  const reference = flatten(resources[referenceLocale][namespace]);
  const referenceLogicalKeys = new Set([...reference.keys()].map(logicalKey));

  for (const locale of comparisonLocales) {
    const comparison = flatten(resources[locale][namespace]);
    const comparisonLogicalKeys = new Set([...comparison.keys()].map(logicalKey));
    assert.deepEqual(
      [...comparisonLogicalKeys].sort(),
      [...referenceLogicalKeys].sort(),
      `${locale}/${namespace} must match ${referenceLocale}/${namespace} keys`,
    );

    for (const key of referenceLogicalKeys) {
      const referenceValues = representativeValues(reference, key);
      const comparisonValues = representativeValues(comparison, key);
      const referenceParams = captures(referenceValues[0], interpolationPattern);
      const referenceTags = captures(referenceValues[0], richTagPattern);

      for (const value of [...referenceValues, ...comparisonValues]) {
        assert.deepEqual(
          captures(value, interpolationPattern),
          referenceParams,
          `${locale}/${namespace}:${key} must preserve interpolation parameters`,
        );
        assert.deepEqual(
          captures(value, richTagPattern),
          referenceTags,
          `${locale}/${namespace}:${key} must preserve rich-text tags`,
        );
      }
    }

    for (const key of comparison.keys()) {
      if (pluralSuffixPattern.test(key)) continue;
      assert.ok(reference.has(key), `${referenceLocale}/${namespace}:${key} is missing`);
    }
  }

  for (const locale of i18nConfig.supportedLocales) {
    const flattened = flatten(resources[locale][namespace]);
    const pluralBases = new Set(
      [...flattened.keys()]
        .filter((key) => pluralSuffixPattern.test(key))
        .map((key) => key.replace(pluralSuffixPattern, '')),
    );
    const categories = new Intl.PluralRules(locale).resolvedOptions()
      .pluralCategories;

    for (const base of pluralBases) {
      for (const category of categories) {
        assert.ok(
          flattened.has(`${base}_${category}`),
          `${locale}/${namespace}:${base}_${category} is required by Intl.PluralRules`,
        );
      }
    }
  }
}

const instance = createInstance();
await instance.init({
  lng: 'ru',
  fallbackLng: 'ru',
  defaultNS: 'auth',
  resources,
  initAsync: false,
  interpolation: { escapeValue: false },
});

assert.equal(
  instance.t('common:metadata.root.title', { appName: 'Authora' }),
  'Authora — защищённая цифровая идентичность',
);
assert.match(
  instance.t('auth:twoFactor.recovery.remainingCodes', { count: 1 }),
  /1 резервный код/,
);
assert.match(
  instance.t('auth:twoFactor.recovery.remainingCodes', { count: 2 }),
  /2 резервных кода/,
);
assert.match(
  instance.t('auth:twoFactor.recovery.remainingCodes', { count: 5 }),
  /5 резервных кодов/,
);

await instance.changeLanguage('en');
assert.equal(
  instance.t('profile:security.email.codeSent', { email: 'user@example.com' }),
  'Confirmation code sent to user@example.com',
);
assert.match(
  instance.t('auth:twoFactor.recovery.remainingCodes', { count: 1 }),
  /1 recovery code remains/,
);
assert.match(
  instance.t('auth:twoFactor.recovery.remainingCodes', { count: 2 }),
  /2 recovery codes remain/,
);

console.log('i18n locale parity, interpolation and pluralization checks passed');
