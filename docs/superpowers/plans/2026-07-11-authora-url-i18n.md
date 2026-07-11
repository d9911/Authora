# Authora URL i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production-ready Russian and English localization whose current locale is the first URL segment, while preserving Authora routes, auth logic, APIs, design, and user flows.

**Architecture:** Move the existing App Router UI tree once under `app/[locale]`; API/static endpoints remain outside it. `shared/i18n` owns the sole locale configuration, URL helpers, per-request i18next instances, current-locale React provider, error-code mapping, and Intl helpers. The existing `src/proxy.ts` remains the routing/auth owner and adds locale redirects plus localized auth redirects.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.7, TypeScript 6.0.3, i18next 26.3.6, react-i18next 17.0.9, Yarn 1.22.22, Node 24.

## Global Constraints

- URL is authoritative; `defaultLocale` is `ru`; initial locales are exactly `ru` and `en`.
- Do not prefix API routes, framework/static assets, service worker, metadata files, health checks, or webhooks.
- Do not duplicate pages or route definitions and do not change GraphQL/backend contracts.
- Preserve pathname, query, hash, localized `next`, and open-redirect protection.
- Do not translate identifiers, route names, API codes, enum values, or user/server data.
- Loading one page may include only its current locale plus the required Russian fallback resources, never every supported locale.
- Adding `es` changes only `supportedLocales`, locale JSON files, and optional display metadata.
- Existing business logic and visual styling remain unchanged.

---

### Task 1: Locale configuration and URL contracts

**Files:**
- Create: `frontend/src/shared/i18n/config.ts`
- Create: `tests/i18n-config-and-routing.mjs`
- Modify: `tests/check-source.mjs`

**Interfaces:**
- Produces `i18nConfig`, `SupportedLocale`, `isSupportedLocale`, `normalizeLocale`, `getLocaleFromPathname`, `stripLocaleFromPathname`, `localizePath`, `replaceLocaleInUrl`, `detectPreferredLocale`, and locale metadata.

- [ ] Write assertions for supported/unknown locales, `/` and nested paths, query/hash preservation, browser language quality values, saved preference priority, and Russian fallback.
- [ ] Run `node tests/i18n-config-and-routing.mjs`; expect an assertion failure because the locale module is absent.
- [ ] Implement the immutable config and pure helpers. The public contract starts with:

```ts
export const i18nConfig = {
  defaultLocale: 'ru',
  supportedLocales: ['ru', 'en'],
  namespaces: ['common', 'auth', 'profile', 'locations', 'ui', 'validation', 'errors'],
  localeCookieName: 'authora_locale',
} as const;

export type SupportedLocale = (typeof i18nConfig.supportedLocales)[number];
```

- [ ] Re-run the test and `cd frontend && yarn typecheck`; expect both to pass.

### Task 2: Physical localized route tree and proxy

**Files:**
- Move once: `frontend/src/app/{layout.tsx,page.tsx,not-found.tsx,loading.tsx,(auth),(private),(public),oauth}` to `frontend/src/app/[locale]/...`
- Keep: `frontend/src/app/api/**`, `frontend/src/app/icon.svg`, `frontend/public/**`
- Modify: `frontend/src/proxy.ts`, `frontend/src/shared/lib/routes.ts`, `frontend/next.config.mjs`
- Test: `tests/i18n-config-and-routing.mjs`, `tests/i18n-route-integration.mjs`

**Interfaces:**
- `getLocalizedRoutes(locale)` localizes the existing base `ROUTES` registry.
- Proxy validates the first segment, redirects missing locale using cookie → Accept-Language → `ru`, persists a supported locale cookie, and runs auth checks against the locale-stripped route.

- [ ] Add failing source/route assertions for the `[locale]` root, matcher exclusions, `/sign-in → /ru/sign-in`, localized protected redirects, and untouched `/api/graphql`, `/sw.js`, `/manifest.json`.
- [ ] Move files without copying them and update route-sensitive tests.
- [ ] Update proxy page matcher plus the separate `/api/private/:path*` matcher. Unsupported locale-like prefixes canonicalize to the detected supported locale; all other unknown paths use localized 404.
- [ ] Make sensitive auth headers match `/:locale/forgot-password`, `/:locale/reset-password`, and `/:locale/confirm-email` without enumerating locales.
- [ ] Run source tests, frontend typecheck, and production build.

### Task 3: i18next server/client runtime and locale resources

**Files:**
- Modify: `frontend/package.json`, `frontend/yarn.lock`
- Create: `frontend/src/shared/i18n/{options.ts,resources.server.ts,server.ts,I18nProvider.tsx,client.ts,index.ts}`
- Create: `frontend/src/shared/i18n/locales/{ru,en}/{common,auth,profile,locations,ui,validation,errors}.json`
- Modify: `frontend/src/app/[locale]/layout.tsx`
- Test: `tests/i18n-locale-parity.mjs`

**Interfaces:**
- `loadLocaleResources(locale)` dynamically imports only current + Russian fallback JSON.
- `getServerTranslation(locale, namespaces)` creates and awaits an isolated i18next instance per request.
- `I18nProvider` owns one client instance and changes language/resources without global re-initialization.

- [ ] Install exact compatible versions `i18next@26.3.6` and `react-i18next@17.0.9`.
- [ ] Add failing parity/namespace/interpolation-parameter tests.
- [ ] Add complete Russian and English resource skeletons and make parity green.
- [ ] Validate locale with `notFound`, generate static locale params, render `<html lang dir>`, provide current/fallback resources, and generate localized root metadata.
- [ ] Run parity tests, typecheck, and build.

### Task 4: Localized navigation, language switcher, and auth redirects

**Files:**
- Create: `frontend/src/features/LanguageSwitcher/LanguageSwitcher.tsx`
- Create: `frontend/src/features/LanguageSwitcher/LanguageSwitcher.module.scss`
- Modify: `HeaderMain`, `FooterMain`, root layout, all Link/router/window-location call sites, OAuth completion, password/email recovery, Telegram flows, `graphqlClient.ts`
- Test: `tests/i18n-config-and-routing.mjs`, `tests/i18n-route-integration.mjs`

**Interfaces:**
- Switcher reads `supportedLocales`, current URL locale, and locale metadata; it calls `replaceLocaleInUrl(pathname + search + hash, nextLocale)`, writes only the preference cookie, and uses `router.replace(..., { scroll: false })`.
- All auth defaults and `next` values use `getLocalizedRoutes(locale)` while `optionalNextPath` retains same-origin protection.

- [ ] Add failing assertions for localized links, `next`, OAuth completion, logout, confirmation, query/hash replacement, and switcher config usage.
- [ ] Add the accessible native language selector next to the existing theme action.
- [ ] Convert all internal navigation entry points to localized routes; leave backend/provider/API callback URLs unprefixed.
- [ ] Run source tests and browser route smoke tests.

### Task 5: Auth, validation, notifications, and stable API errors

**Files:**
- Modify: auth forms, recovery forms, OAuth/Telegram buttons, connected accounts, 2FA, shared password/loader/theme controls, auth/profile slices, `shared/lib/errors.ts`
- Create: `frontend/src/shared/i18n/errors.ts`
- Test: parity and source-coverage scripts

**Interfaces:**
- `errorKeyByCode` maps stable GraphQL codes to `errors` keys.
- Redux thunks retain a stable code; components render a localized key and never a raw backend message when a mapped code exists.

- [ ] Add failing source coverage for known hardcoded auth literals and raw GraphQL error rendering.
- [ ] Replace confirmed strings with semantic keys, interpolation, and current locale routes without changing submit/request logic.
- [ ] Translate aria labels, OTP/recovery statuses, dialogs, and notifications.
- [ ] Run source tests, typecheck, and existing auth/account-recovery tests.

### Task 6: Public, profile, UI-kit, metadata, and Intl

**Files:**
- Modify: home/about/location/profile/photo/UI-kit pages and components, header/footer, localized page metadata files
- Create: `frontend/src/shared/i18n/format.ts`, `frontend/src/shared/i18n/metadata.ts`
- Test: `tests/i18n-locale-parity.mjs`, `tests/i18n-source-coverage.mjs`

**Interfaces:**
- `formatDate`, `formatNumber`, `formatPercent`, `formatCurrency`, and `formatRelativeTime` wrap standard `Intl` with the URL locale.
- `buildLocalizedAlternates(path)` returns canonical + hreflang entries from `supportedLocales` and production origin `https://www.auth.d9911`.

- [ ] Translate every mounted string listed in `docs/i18n/audit.md`; leave user data and technical values intact.
- [ ] Add localized public canonical/hreflang metadata and `noindex` auth/private metadata.
- [ ] Use an actual count key in UI-kit and assert Russian/English plural forms; assert interpolation.
- [ ] Run parity, source coverage, typecheck, and build.

### Task 7: Integration tests, smoke tests, and documentation

**Files:**
- Create: `tests/i18n-route-integration.mjs`, `tests/i18n-source-coverage.mjs`
- Modify: `tests/check-source.mjs`, `Makefile`
- Create: `docs/i18n/README.md`
- Update: `docs/i18n/audit.md`

**Interfaces:**
- HTTP integration script accepts `I18N_BASE_URL` and validates redirects, localized content, protected routes, API/static exclusions, and unknown locale behavior. A deterministic production SSR test validates fallback rendering without exposing a test-only page.

- [ ] Add the unit/parity/source suites to `check-source`; add an explicit integration Make target.
- [ ] Build and start the production server, run HTTP integration, then Playwright smoke for RU/EN, switcher query/hash, reload, one auth redirect, and hydration console.
- [ ] Document architecture, URL contract, namespaces, fallback, error mapping, formatting, tests, pitfalls, and the exact eight-step `es` procedure from the task specification.
- [ ] Run `make check`, frontend lint, production build, route integration, browser smoke, `git diff --check`, and a final full-diff review.
