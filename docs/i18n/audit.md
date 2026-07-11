# Authora i18n audit

Snapshot: `e626145` (before i18n implementation). Repeated literals are grouped by the component that owns them. Runtime values such as user names, emails, location names, IDs, API codes, route names, enum values, and OAuth provider names are deliberately not translation keys.

| Файл:строка | Компонент | Текст | Namespace | Translation key | Параметры | Pluralization | Статус |
|---|---|---|---|---|---|---|---|
| `frontend/src/app/layout.tsx:11` | Root metadata | `identity, secured`; application description | `common` | `metadata.root.title`, `metadata.root.description` | `appName` | — | hardcoded → P1 |
| `frontend/src/app/layout.tsx:27` | Root HTML | `lang="en"` | config | URL locale | `locale`, `dir` | — | incorrect for localized URL → P0 |
| `frontend/src/app/page.tsx:6` | Home | hero, capability titles/descriptions, CTA labels, eyebrow | `common` | `home.*` | `appName` | — | hardcoded → P2 |
| `frontend/src/app/not-found.tsx:7` | 404 | `This page could not be found`; `Go home` | `common` | `notFound.title`, `notFound.description`, `notFound.home` | — | — | hardcoded → P2 |
| `frontend/src/app/loading.tsx:3` | Route loading | loader default | `common` | `status.loading` | — | — | hardcoded in primitive → P2 |
| `frontend/src/app/(public)/about/page.tsx:3` | About | metadata, heading, product description, stack summary | `common` | `metadata.about.title`, `about.*` | `appName` | — | hardcoded → P2 |
| `frontend/src/app/(public)/country/page.tsx:5` | Countries | metadata and heading | `locations` | `metadata.countries.title`, `countries.title` | — | — | hardcoded → P2 |
| `frontend/src/app/(public)/country/[id]/page.tsx:34` | Country | `All countries`; `Regions` | `locations` | `country.all`, `country.regions` | — | — | hardcoded → P2 |
| `frontend/src/app/(public)/region/[id]/page.tsx:34` | Region | `Back to country`; `Cities` | `locations` | `region.back`, `region.cities` | — | — | hardcoded → P2 |
| `frontend/src/app/(public)/city/[id]/page.tsx:29` | City | `Back to region`; `City` | `locations` | `city.back`, `city.eyebrow` | — | — | hardcoded → P2 |
| `frontend/src/app/(public)/city/[id]/page.tsx:37` | City identifiers | `city_id`, `country_id`, `region_id` | — | — | — | — | technical identifiers → keep |
| `frontend/src/widgets/HeaderMain/HeaderMain.tsx:91` | Header | menu aria-label, Countries, About, Profile, Logout, Sign In, Get started | `common` | `navigation.*`, `actions.*`, `accessibility.toggleMenu` | — | — | hardcoded → P1/P2 |
| `frontend/src/widgets/FooterMain/FooterMain.tsx:10` | Footer | column titles and internal/external link labels | `common` | `footer.columns.*`, `footer.links.*` | — | — | hardcoded → P2 |
| `frontend/src/widgets/FooterMain/FooterMain.tsx:54` | Footer | Russian product description; copyright; policies; build caption | `common` | `footer.description`, `footer.copyright`, `footer.privacy`, `footer.terms`, `footer.builtWith` | `year`, `appName` | — | mixed languages → P2 |
| `frontend/src/features/SignInForm/SignInForm.tsx:74` | Sign in / 2FA | titles, subtitles, labels, recovery/authenticator actions, Back | `auth` | `signIn.*`, `twoFactor.*` | — | — | hardcoded → P1 |
| `frontend/src/features/SignInForm/SignInForm.tsx:134` | Sign in | welcome, form labels, account CTA, forgot password, recovery success, OAuth divider | `auth` | `signIn.*` | `appName` | — | mixed languages → P1 |
| `frontend/src/features/SignUpForm/SignUpForm.tsx:14` | Registration | mismatch error, title, labels, password toggle aria, submit, post-signup hint | `auth`, `validation` | `signUp.*`, `password.mismatch` | — | — | mixed languages → P1 |
| `frontend/src/features/ConfirmEmailForm/ConfirmEmailForm.tsx:31` | Email confirmation | validation, title/subtitle, labels, success/resend, buttons | `auth`, `validation` | `confirmEmail.*`, `otp.*` | `email` | — | hardcoded → P1 |
| `frontend/src/features/PasswordResetForm/PasswordResetForm.tsx:19` | Recovery | request/reset titles, subtitles, method aria, labels, statuses, actions, failures | `auth`, `validation`, `errors` | `passwordReset.*`, `password.*`, `recovery.*` | — | — | mixed languages → P1 |
| `frontend/src/features/PasswordResetForm/TelegramRecoveryPanel.tsx:55` | Telegram recovery | cancelled/not-linked/expired/errors, instructions, waiting/manual-open actions | `auth`, `errors` | `telegramRecovery.*` | `confirmationCode` | — | hardcoded RU → P1 |
| `frontend/src/features/GithubLoginButton/GithubLoginButton.tsx:23` | GitHub login | `Continue with GitHub` | `auth` | `oauth.github.continue` | — | — | hardcoded → P1 |
| `frontend/src/features/TelegramLoginButton/TelegramLoginButton.tsx:14` | Telegram login | popup titles/messages, provider errors, waiting/fallback/actions | `auth`, `errors` | `oauth.telegram.*` | `command` | — | hardcoded → P1 |
| `frontend/src/features/OAuthComplete/OAuthComplete.tsx:30` | OAuth completion | missing handoff, completion failure, title/back/loading | `auth`, `errors` | `oauth.complete.*` | — | — | hardcoded → P1 |
| `frontend/src/features/ConnectedAccounts/ConnectedAccounts.tsx:239` | Account security | email/password/provider sections, statuses, actions, confirmations and errors | `profile`, `auth`, `errors` | `security.*`, `email.*`, `password.*`, `providers.*` | `email`, `provider` | — | hardcoded → P2 |
| `frontend/src/features/TwoFactorSetup/TwoFactorSetup.tsx:77` | 2FA settings | enable/disable/setup/recovery-code instructions, labels, aria, actions | `auth` | `twoFactorSetup.*` | `count` | i18next count forms | hardcoded → P2 |
| `frontend/src/features/EditProfileForm/EditProfileForm.tsx:160` | Profile editor | headings, field labels, save/status/error copy | `profile`, `errors` | `edit.*` | — | — | hardcoded → P2 |
| `frontend/src/features/EditProfileForm/LocationSelectGroup.tsx:62` | Location fields | Country/Region/City labels and empty placeholders | `profile`, `locations` | `edit.location.*` | — | — | hardcoded → P2 |
| `frontend/src/features/ProfilePhotoManager/ui/ProfilePhotoManager.tsx:20` | Profile images | section title, avatar/cover descriptions and error copy | `profile`, `errors` | `photos.*` | — | — | hardcoded → P2 |
| `frontend/src/features/ProfilePhotoManager/ui/AvatarUploader.tsx:20` | Avatar uploader | title, description, alt and aria | `profile` | `photos.avatar.*` | — | — | hardcoded → P2 |
| `frontend/src/features/ProfilePhotoManager/ui/CoverUploader.tsx:18` | Cover uploader | title, description, alt and aria | `profile` | `photos.cover.*` | — | — | hardcoded → P2 |
| `frontend/src/features/ProfilePhotoManager/ui/ProfileImageUploaderPanel.tsx:51` | Image uploader primitive | choose/upload/replace/delete/cancel labels and generated aria | `profile` | `photos.actions.*`, `photos.accessibility.*` | `title` | — | hardcoded → P2 |
| `frontend/src/shared/ui/LoaderMain/LoaderMain.tsx:3` | Loader | `Loading…` | `common` | `status.loading` | — | — | primitive default → P2 |
| `frontend/src/shared/ui/PasswordInput/PasswordInput.tsx:18` | Password input | show/hide aria and visible labels | `common` | `password.show`, `password.hide` | — | — | mixed languages → P1 |
| `frontend/src/shared/ui/ThemeToggle/ThemeToggle.tsx:11` | Theme toggle | Theme label and light/dark switch aria | `common` | `theme.label`, `theme.switchToLight`, `theme.switchToDark` | — | — | hardcoded → P2 |
| `frontend/src/widgets/page-blocks/UiKitPage/ui/UiKitPage.tsx:6` | UI-kit page | hero, badges, layer cards, tokens, actions and section copy | `ui` | `page.*`, `layers.*`, `tokens.*` | `appName` | — | hardcoded → P2 |
| `frontend/src/entities/ui-kit/ui/UiKitShowcase.tsx:33` | UI-kit showcase | tabs, component catalogue, controls, actions, forms, timeline, modal/toast and accessibility labels | `ui` | `showcase.*`, `components.*` | `count`, `depth` | `stats.groups_*` | hardcoded → P2 |
| `frontend/src/widgets/ProfileCard/ProfileCard.tsx:4` | Profile card | fallback user name and image alt | `profile` | `card.fallbackUser`, `card.coverAlt`, `card.avatarAlt` | — | — | component currently unused; translate before reuse |
| `frontend/src/shared/lib/passwordPolicy.ts:3` | Password validation | password policy hint | `validation` | `password.policy` | `min`, `max` | — | hardcoded RU → P1 |
| `frontend/src/shared/lib/errors.ts:3` | UI error fallback | `Error`; raw backend message passthrough | `errors` | code map + `generic` | `code` | — | raw backend leakage risk → P1 |
| `frontend/src/processes/store/slices/authSlice.ts:34` | Auth state errors | unexpected/sign-in/sign-up/code fallbacks | `errors` | stable GraphQL code map | `code` | — | raw message stored → P1 |
| `frontend/src/processes/store/slices/profileSlice.ts:30` | Profile state errors | load/save/upload/delete fallbacks | `errors` | stable GraphQL code map | `code` | — | raw message stored → P2 |
| `frontend/public/manifest.json:3` | PWA metadata | description | `common` | `metadata.manifest.description` | — | — | static global metadata; default-locale policy required |
| `frontend/public/offline.html:2` | Offline fallback | `Offline`; `You're offline`; connection instruction | `common` | `offline.*` | — | — | static asset, excluded from locale router; document limitation |

## Audit conclusions

- Framework: React 19.2.7 with Next.js 16.2.9 App Router. Route ownership is split between the `app/` filesystem and `shared/lib/routes.ts`.
- Rendering: route pages are Server Components by default; auth/profile interactions are Client Components; location pages use server GraphQL and several routes are force-dynamic.
- Routing: `src/proxy.ts` already owns authentication redirects and is the correct owner for locale detection, prefix redirects, exclusions, and locale-preserving protected-route redirects.
- State: theme uses localStorage; auth uses httpOnly cookies. Locale preference should use a non-httpOnly cookie for future unprefixed visits while URL remains authoritative.
- Errors: GraphQL exposes stable `extensions.code`, but the frontend currently collapses it into raw messages. Localization must retain/map the code.
- Formatting: there is no shared date/number/relative-time formatter yet. `Intl` wrappers belong in `shared/i18n`.
- Tests: no Jest/Vitest/Testing Library dependency exists. The repository uses Node assertion scripts, TypeScript checks, compiled backend tests, production builds, and Playwright CLI smoke tests.
- Dependencies: neither `i18next` nor `react-i18next` exists in `frontend/yarn.lock` before implementation.

## Post-implementation status

All mounted application-owned strings identified above are now translated through the planned namespaces. `tests/i18n-source-coverage.mjs` rejects new raw natural-language JSX text and user-facing string attributes, while `tests/i18n-used-keys.mjs` validates static and dynamic translation contracts against every configured locale. Technical identifiers, user/contact data, provider names, sample codes, and server-generated location names remain intentionally untranslated. The global static `manifest.json` and `offline.html` remain documented exceptions because locale routing deliberately excludes PWA assets.
