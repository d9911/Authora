import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = (value) => resolve(root, value);
const read = (value) => readFileSync(path(value), 'utf8');

const localizedLayoutPath = 'frontend/src/app/[locale]/layout.tsx';
const proxy = read('frontend/src/proxy.ts');
const routes = read('frontend/src/shared/lib/routes.ts');
const nextConfigUrl = new URL('../frontend/next.config.mjs', import.meta.url);
const { default: nextConfig } = await import(nextConfigUrl.href);
assert.equal(nextConfig.skipTrailingSlashRedirect, true);
const configuredHeaderSources = (await nextConfig.headers()).map(({ source }) => source);
const requireFromFrontend = createRequire(new URL('../frontend/package.json', import.meta.url));
const nextPackageDirectory = dirname(requireFromFrontend.resolve('next/package.json'));
const { unstable_doesMiddlewareMatch } = requireFromFrontend(
  resolve(
    nextPackageDirectory,
    'dist/experimental/testing/server/middleware-testing-utils.js',
  ),
);
const matcherLiteral = proxy.match(
  /export const config = \{\s*matcher:\s*(\[[\s\S]*?\]),\s*\};/,
)?.[1];
assert.ok(matcherLiteral, 'proxy matcher must remain statically analyzable');
const proxyMatcher = Function(`"use strict"; return (${matcherLiteral});`)();
const proxyMatches = (url) =>
  unstable_doesMiddlewareMatch({ config: { matcher: proxyMatcher }, nextConfig, url });

const checks = [
  [
    'the user-facing App Router tree has one locale segment instead of copied pages',
    existsSync(path(localizedLayoutPath)) &&
      existsSync(path('frontend/src/app/[locale]/page.tsx')) &&
      existsSync(path('frontend/src/app/[locale]/(auth)/sign-in/page.tsx')) &&
      existsSync(path('frontend/src/app/[locale]/(private)/profile/edit/page.tsx')) &&
      existsSync(path('frontend/src/app/[locale]/(public)/country/[id]/page.tsx')) &&
      !existsSync(path('frontend/src/app/layout.tsx')) &&
      !existsSync(path('frontend/src/app/(auth)')) &&
      !existsSync(path('frontend/src/app/(private)')) &&
      !existsSync(path('frontend/src/app/(public)')),
  ],
  [
    'unknown paths under a supported locale use the localized not-found boundary',
    existsSync(path('frontend/src/app/[locale]/[...notFound]/page.tsx')) &&
      /notFound\(\)/.test(read('frontend/src/app/[locale]/[...notFound]/page.tsx')) &&
      /useTranslation\('common'\)/.test(read('frontend/src/app/[locale]/not-found.tsx')),
  ],
  [
    'API routes and static app assets remain outside the locale segment',
    existsSync(path('frontend/src/app/api/graphql/route.ts')) &&
      existsSync(path('frontend/src/app/api/auth/github/callback/route.ts')) &&
      existsSync(path('frontend/src/app/icon.svg')) &&
      !existsSync(path('frontend/src/app/[locale]/api')),
  ],
  [
    'the locale root layout validates params and emits locale-specific html attributes',
    existsSync(path(localizedLayoutPath)) &&
      /isSupportedLocale/.test(read(localizedLayoutPath)) &&
      /notFound\(\)/.test(read(localizedLayoutPath)) &&
      /generateStaticParams/.test(read(localizedLayoutPath)) &&
      /i18nConfig\.supportedLocales/.test(read(localizedLayoutPath)) &&
      /lang=\{locale\}/.test(read(localizedLayoutPath)) &&
      /dir=\{localeMetadata\.dir\}/.test(read(localizedLayoutPath)),
  ],
  [
    'the route registry keeps base routes and exposes one localized route builder',
    /export const ROUTES/.test(routes) &&
      /export function getLocalizedRoutes/.test(routes) &&
      /localizePath/.test(routes),
  ],
  [
    'proxy derives missing locales from cookie/browser/default and persists URL locale',
    /detectPreferredLocale/.test(proxy) &&
      /getLocaleFromPathname/.test(proxy) &&
      /i18nConfig\.localeCookieName/.test(proxy) &&
      /accept-language/.test(proxy) &&
      /response\.cookies\.set/.test(proxy),
  ],
  [
    'proxy preserves a trailing slash only for locale roots',
    /logicalPathname === '\/'/.test(proxy) &&
      /pathname\.endsWith\('\/'\)/.test(proxy),
  ],
  [
    'proxy auth redirects preserve the localized attempted URL in next',
    /stripLocaleFromPathname/.test(proxy) &&
      /getLocalizedRoutes\(locale\)/.test(proxy) &&
      /encodeURIComponent\(pathname \+ search\)/.test(proxy),
  ],
  [
    'proxy matcher handles private APIs separately and excludes API/static traffic from locale routing',
    /\/api\/private\/:path\*/.test(proxy) &&
      /\(\?!api/.test(proxy) &&
      /_next/.test(proxy) &&
      proxy.includes('sw\\\\.js') &&
      proxy.includes('manifest\\\\.json'),
  ],
  [
    'the compiled Next matcher covers pages/private APIs but bypasses API and static routes',
    proxyMatches('/') &&
      proxyMatches('/sign-in') &&
      proxyMatches('/ru/sign-in') &&
      proxyMatches('/api/private/session') &&
      !proxyMatches('/api/graphql') &&
      !proxyMatches('/_next/static/chunk.js') &&
      !proxyMatches('/sw.js') &&
      !proxyMatches('/manifest.json') &&
      !proxyMatches('/health') &&
      !proxyMatches('/webhook/github'),
  ],
  [
    'sensitive recovery headers cover locale-prefixed pages',
    ['/forgot-password', '/reset-password', '/confirm-email'].every(
      (source) =>
        configuredHeaderSources.includes(source) &&
        configuredHeaderSources.includes(`/:locale${source}`),
    ),
  ],
];

const failed = checks.filter(([, ok]) => !ok);

if (failed.length > 0) {
  console.error('i18n locale routing contract checks failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('i18n locale routing contract checks passed');
