import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'frontend/src');
const localesRoot = path.join(sourceRoot, 'locales');
const { i18nConfig } = await import(
  pathToFileURL(path.join(sourceRoot, 'shared/i18n/config.ts')).href
);
const { errorKeyByCode } = await import(
  pathToFileURL(path.join(sourceRoot, 'shared/i18n/errors.ts')).href
);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(filename);
      return /\.(?:ts|tsx)$/.test(entry.name) ? [filename] : [];
    }),
  );
  return files.flat();
}

function hasKey(resource, key) {
  const value = key.split('.').reduce(
    (node, segment) =>
      node && typeof node === 'object' ? node[segment] : undefined,
    resource,
  );
  if (typeof value === 'string') return true;

  const segments = key.split('.');
  const leaf = segments.pop();
  const parent = segments.reduce(
    (node, segment) =>
      node && typeof node === 'object' ? node[segment] : undefined,
    resource,
  );
  return Boolean(
    parent &&
      typeof parent === 'object' &&
      Object.keys(parent).some((candidate) =>
        candidate.startsWith(`${leaf}_`) &&
        /_(?:zero|one|two|few|many|other)$/.test(candidate),
      ),
  );
}

const resources = {};
for (const locale of i18nConfig.supportedLocales) {
  resources[locale] = {};
  for (const namespace of i18nConfig.namespaces) {
    resources[locale][namespace] = JSON.parse(
      await readFile(path.join(localesRoot, locale, `${namespace}.json`), 'utf8'),
    );
  }
}

const usages = [];
for (const filename of await sourceFiles(sourceRoot)) {
  if (filename.includes(`${path.sep}shared${path.sep}i18n${path.sep}`)) continue;
  const source = await readFile(filename, 'utf8');
  const bindings = new Map();

  for (const match of source.matchAll(
    /const\s*{\s*t(?:\s*:\s*([A-Za-z_$][\w$]*))?\s*}\s*=\s*useTranslation\(\s*['"]([^'"]+)['"]\s*\)/g,
  )) {
    bindings.set(match[1] ?? 't', match[2]);
  }
  for (const match of source.matchAll(
    /const\s*{\s*t(?:\s*,[^}]*)?\s*}\s*=\s*await\s+getServerTranslation\([^,]+,\s*['"]([^'"]+)['"]\s*\)/g,
  )) {
    bindings.set('t', match[1]);
  }

  for (const [binding, namespace] of bindings) {
    const callPattern = new RegExp(
      `\\b${binding}\\(\\s*(['"])([^'"]+)\\1`,
      'g',
    );
    for (const match of source.matchAll(callPattern)) {
      usages.push({ filename, namespace, key: match[2] });
    }
  }

  for (const match of source.matchAll(
    /<Trans(?:WithoutContext)?\b(?:(?!\/>|<\/Trans(?:WithoutContext)?>).)*?\bt\s*=\s*{([A-Za-z_$][\w$]*)}(?:(?!\/>|<\/Trans(?:WithoutContext)?>).)*?\bi18nKey\s*=\s*['"]([^'"]+)['"]/gs,
  )) {
    const namespace = bindings.get(match[1]);
    if (namespace) usages.push({ filename, namespace, key: match[2] });
  }
}

const dynamicUsages = {
  common: [
    'theme.label',
    'theme.light',
    'theme.dark',
    'theme.switchToLight',
    'theme.switchToDark',
    ...['auth', 'twoFactor', 'oauth', 'atlas'].flatMap((id) => [
      `home.capabilities.${id}.title`,
      `home.capabilities.${id}.description`,
    ]),
  ],
  profile: [
    'photos.confirmDeleteAvatar',
    'photos.confirmDeleteCover',
  ],
  errors: [
    ...Object.values(errorKeyByCode),
    'fallback',
    'loadProfile',
    'saveProfile',
    'uploadImage',
    'deleteImage',
    'sendRecovery',
    'changePassword',
    'checkTelegram',
    'openTelegram',
  ],
  ui: [
    ...[
      'spatial-card',
      'hero-preview',
      'actions',
      'segment-tabs',
      'inputs',
      'overlay',
      'entity-group',
      'page-block',
    ].flatMap((id) => [`components.${id}.title`, `components.${id}.description`]),
    ...['ready', 'interactive', 'layout'].map((id) => `showcase.status.${id}`),
    ...['surfaces', 'actions', 'forms', 'feedback'].map(
      (id) => `showcase.categories.${id}`,
    ),
    ...['primitive', 'composition', 'pageBlock', 'route'].flatMap((id) => [
      `showcase.timeline.steps.${id}.title`,
      `showcase.timeline.steps.${id}.description`,
    ]),
  ],
};

for (const [namespace, keys] of Object.entries(dynamicUsages)) {
  for (const key of keys) usages.push({ filename: '<dynamic contract>', namespace, key });
}

assert.ok(usages.length > 0, 'Expected to discover translation key usages');
for (const { filename, namespace, key } of usages) {
  assert.ok(
    i18nConfig.namespaces.includes(namespace),
    `${path.relative(root, filename)} uses unknown namespace ${namespace}`,
  );
  for (const locale of i18nConfig.supportedLocales) {
    assert.ok(
      hasKey(resources[locale][namespace], key),
      `${path.relative(root, filename)} uses missing ${locale}/${namespace}:${key}`,
    );
  }
}

console.log(`i18n used-key check passed (${usages.length} static and contracted keys)`);
