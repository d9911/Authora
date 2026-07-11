# Локализация Authora

## Область действия

Authora использует URL-based локализацию в Next.js App Router. Язык открытой страницы задаётся первым сегментом URL; cookie хранит только предпочтение для будущих запросов без языкового префикса.

Начальная конфигурация:

- основной и fallback-язык: `ru`;
- поддерживаемые языки: `ru`, `en`;
- production origin: `https://www.auth.d9911`;
- runtime: `i18next` + `react-i18next`;
- пользовательские страницы: `frontend/src/app/[locale]/**`;
- API-маршруты: `frontend/src/app/api/**`, без locale-префикса.

Исходный аудит строк и владельцев компонентов находится в [`docs/i18n/audit.md`](./audit.md).

Корень проекта: `/Users/d9911/JS/training/Authora`. Полный локальный stack запускается командой `make dev`; отдельно frontend — `cd frontend && yarn dev` (порт `5178`).

## Архитектура и владельцы

| Ответственность | Владелец |
|---|---|
| Список языков, default locale, namespaces, cookie и URL helpers | `frontend/src/shared/i18n/config.ts` |
| Метаданные языка (`label`, `dir`) | `frontend/src/shared/i18n/config.ts` |
| Базовый registry маршрутов и его локализованное представление | `frontend/src/shared/lib/routes.ts` |
| Redirect без locale, исключения и auth guard | `frontend/src/proxy.ts` |
| Физическое дерево пользовательских маршрутов | `frontend/src/app/[locale]/**` |
| Переводы | `frontend/src/locales/<locale>/<namespace>.json` |
| Server/client runtime i18next | `frontend/src/shared/i18n/**` |
| Canonical и `hreflang` | `frontend/src/shared/i18n/metadata.ts` |
| Переключатель языка | `frontend/src/features/LanguageSwitcher/LanguageSwitcher.tsx` |

Страницы не копируются по языкам. Одна страница получает `locale` из динамического сегмента `[locale]`, проверяет его через `isSupportedLocale` и использует те же компоненты и API-контракты для всех языков.

`ROUTES` хранит логические пути без префикса. Для UI используется `getLocalizedRoutes(locale)`, поэтому route definitions не дублируются:

```ts
const routes = getLocalizedRoutes(locale);
// routes.signIn: /ru/sign-in или /en/sign-in
```

## URL contract

Поддерживаемые пользовательские URL:

```text
/ru/
/en/
/ru/sign-in
/en/sign-in
/ru/reset-password?token=123
```

Для URL без первого locale-сегмента `frontend/src/proxy.ts` выбирает язык в строгом порядке:

1. поддерживаемое значение cookie `authora_locale`;
2. первый поддерживаемый язык из `Accept-Language` с учётом `q`;
3. `defaultLocale`, то есть `ru`.

Затем выполняется redirect с сохранением pathname и query string:

| Входной URL | Результат при выбранном `ru` |
|---|---|
| `/` | `/ru/` |
| `/sign-in` | `/ru/sign-in` |
| `/reset-password?token=123` | `/ru/reset-password?token=123` |
| `/login?next=%2Fru%2Fprofile%2Fedit` | `/ru/sign-in?next=%2Fru%2Fprofile%2Fedit` |

Locale-root канонизируется с завершающим slash (`/ru/`, `/en/`); вложенные страницы — без него (`/ru/sign-in`). Эту политику явно реализует proxy при включённом `skipTrailingSlashRedirect`, поэтому `/ru` → `/ru/`, а `/ru/sign-in/` → `/ru/sign-in` с сохранением query.

Hash-фрагмент не отправляется HTTP-серверу. Его явно сохраняют client-side URL helpers и language switcher при замене locale.

Locale считается поддерживаемым только при точном совпадении с `i18nConfig.supportedLocales`. Пока `es` не добавлен в конфигурацию, `/es/sign-in` не интерпретируется как испанская страница: proxy снимает неподдерживаемый language-shaped сегмент и выполняет canonical redirect на язык, выбранный по cookie → `Accept-Language` → `ru`. Например, `/es/sign-in?next=%2Faccount` становится `/ru/sign-in?next=%2Faccount` при русском предпочтении. Неизвестный путь после такой канонизации обрабатывается локализованной not-found boundary, например `/es/no-such-page` → `/ru/no-such-page` → русский 404 UI. Query string сохраняется, redirect loop не возникает. Из-за корневого streaming loading boundary Next.js отправляет для этого UI HTTP `200`, но в RSC payload остаётся `NEXT_HTTP_ERROR_FALLBACK;404` и в `<head>` добавляется `robots=noindex`; это стандартный контракт streamed not-found в App Router.

### Исключения

Locale-префикс не добавляется к:

- `/api/**`, включая GraphQL и OAuth callback;
- `/_next/**`;
- файлам с расширением и статическим assets;
- `/favicon.ico`, `/icon.svg`, `/manifest.json`;
- `/sw.js`, `/offline.html`;
- `/robots.txt`, sitemap XML;
- `/health/**`;
- `/webhook/**` и `/webhooks/**`.

`/api/private/**` также остаётся нелокализованным, но отдельно проходит существующую cookie-based auth-проверку и при отсутствии сессии возвращает JSON `401`, а не redirect на страницу входа.

## Конфигурация locale

Единственный список языков находится в `frontend/src/shared/i18n/config.ts`:

```ts
export const i18nConfig = {
  defaultLocale: 'ru',
  supportedLocales: ['ru', 'en'],
  namespaces: ['common', 'auth', 'profile', 'locations', 'ui', 'validation', 'errors'],
  localeCookieName: 'authora_locale',
} as const;
```

Из него выводится `SupportedLocale`. Тот же модуль предоставляет:

- `isSupportedLocale` — точная проверка публичного URL-контракта;
- `normalizeLocale` — нормализация browser/cookie locale (`en-US` → `en`);
- `getLocaleFromPathname` — чтение первого сегмента;
- `stripLocaleFromPathname` — получение логического пути;
- `localizePath` — добавление/замена префикса с сохранением query/hash;
- `replaceLocaleInUrl` — смена языка текущего URL;
- `detectPreferredLocale` — выбор cookie → browser → default;
- `getLocaleMetadata` — доступное имя языка и направление текста.

URL остаётся источником истины даже при наличии cookie. Открытие `/ru/...` всегда означает русский интерфейс, а `/en/...` — английский.

## i18next и ресурсы

Ресурсы организованы по namespace:

```text
frontend/src/locales/
  ru/
    common.json
    auth.json
    profile.json
    locations.json
    ui.json
    validation.json
    errors.json
  en/
    common.json
    auth.json
    profile.json
    locations.json
    ui.json
    validation.json
    errors.json
```

Назначение namespaces:

| Namespace | Содержимое |
|---|---|
| `common` | navigation, header/footer, общие actions/status, theme, home/about/404, metadata |
| `auth` | sign-in, sign-up, email confirmation, recovery, OAuth/Telegram, 2FA |
| `profile` | профиль, безопасность аккаунта, связанные providers, фото |
| `locations` | страны, регионы, города и location fields |
| `ui` | демонстрационная UI-kit страница и доступные подписи её компонентов |
| `validation` | сообщения form/OTP/password/file validation |
| `errors` | локализованные сообщения для стабильных API error codes и безопасные fallback-сообщения |

Ключи семантические и не зависят от текста, например `auth:signIn.submit`. Имена маршрутов, enum, API error codes, идентификаторы и пользовательские данные не переводятся.

`resources.server.ts` динамически загружает namespaces только текущего языка и русского fallback. `server.ts` создаёт отдельный i18next instance на запрос через `createInstance()`. `I18nProvider.tsx` создаёт один client instance на mount и передаёт его через `I18nextProvider`; повторная глобальная инициализация при render не используется. `fallbackLng` равен `ru`.

В development missing key логируется, чтобы ошибка была видна до релиза. В production перевод падает назад на русский ресурс и затем на локализованное `common.status.unavailable`; если даже этот ресурс недоступен, используется нейтральное `Translation unavailable`. Raw key не должен попадать в интерфейс. Структура `ru` является эталонной: parity-тест проверяет namespaces, типы значений, пути ключей и interpolation-параметры в `en`. Отдельный used-key test проверяет статические вызовы `t`/`Trans` и явно перечисленные динамические key contracts.

В i18next установлено `interpolation.escapeValue: false`, потому что значения выводятся React, а React самостоятельно экранирует текстовые interpolation values. Непроверенный HTML в translation resources не вставляется.

## Переводы, interpolation и pluralization

Новый текст добавляется так:

1. Выберите namespace по владельцу текста.
2. Добавьте стабильный semantic key в русский эталонный JSON.
3. Добавьте тот же key и те же interpolation parameters во все поддерживаемые locale.
4. Используйте `t('key')`, `t('key', { value })`, client-side `Trans` или `TransWithoutContext` в Server Component для rich-text разметки. В последнем случае явно передавайте и `t`, и request-scoped `i18n`.
5. Запустите parity-тест и typecheck.

Не собирайте локализованные предложения конкатенацией. Передавайте число как `count` и определяйте формы i18next, например:

```json
{
  "remainingCodes_one": "Остался {{count}} резервный код",
  "remainingCodes_few": "Осталось {{count}} резервных кода",
  "remainingCodes_many": "Осталось {{count}} резервных кодов",
  "remainingCodes_other": "Осталось {{count}} резервного кода"
}
```

Английский ресурс использует собственные формы `_one` и `_other`. UI-kit и 2FA содержат реальные count-based примеры; parity/plural tests должны проверять обе локали.

Для дат, времени, чисел, процентов, валюты и relative time используйте `formatDate`, `formatTime`, `formatDateTime`, `formatNumber`, `formatPercent`, `formatCurrency` и `formatRelativeTime` из `frontend/src/shared/i18n/format.ts`. Все wrappers построены на стандартном `Intl` и принимают URL locale; нельзя полагаться на locale окружения Node или браузера по умолчанию.

## Переключатель языка

`LanguageSwitcher` рендерит нативный `<select>` и получает варианты из `i18nConfig.supportedLocales`; отдельного массива языков в компоненте нет. Текущая опция берётся из URL locale.

При переключении компонент:

1. получает pathname через App Router;
2. добавляет текущие query parameters;
3. добавляет `window.location.hash`;
4. вызывает `replaceLocaleInUrl`;
5. сохраняет предпочтение в cookie;
6. выполняет `router.replace(nextUrl, { scroll: false })`.

Пример:

```text
/ru/reset-password?token=123#form
→ /en/reset-password?token=123#form
```

Нативный select обеспечивает keyboard navigation. У него есть локализованное доступное имя; расположение рядом с существующим theme action сохраняет текущий responsive header.

## Auth и redirects

Proxy выполняет auth-проверки по locale-stripped пути, но строит пользовательские redirect URL через `getLocalizedRoutes(locale)`:

```text
/ru/profile/edit
→ /ru/sign-in?next=%2Fru%2Fprofile%2Fedit
→ /ru/profile/edit
```

Query исходного protected URL входит в `next`. Client-side refresh/logout, sign-in, sign-up, email confirmation, password recovery, Telegram и OAuth completion также используют локализованный registry маршрутов.

HTTP redirect не получает fragment, но браузер наследует исходный hash при переходе на sign-in. `getPostAuthRedirectPath` добавляет этот hash обратно только к валидному явному `next`; hash напрямую открытой страницы sign-in не переносится на fallback `/profile/edit`.

`optionalNextPath`/`safeNextPath` принимают только same-origin относительный путь: значение должно начинаться с одного `/`, не может начинаться с `//`, после разбора должно иметь внутренний origin. Внешний `next=https://example.com` или protocol-relative `next=//example.com` отклоняется и заменяется локализованным fallback-маршрутом.

Backend endpoints, GraphQL, provider URL и OAuth callback не локализуются. Locale возвращаемой frontend-страницы переносится через безопасный `next` и локализованные frontend redirects без изменения API-контрактов.

Стабильный `extensions.code` GraphQL сохраняется в frontend error descriptor. Известные codes переводятся через map в namespace `errors`; raw backend message используется только как диагностический descriptor и не должен выводиться вместо предусмотренного локализованного сообщения.

## HTML, metadata и SEO

`frontend/src/app/[locale]/layout.tsx` проверяет параметр, генерирует static params из общей конфигурации и устанавливает:

```tsx
<html lang={locale} dir={getLocaleMetadata(locale).dir}>
```

`dir` уже принадлежит locale metadata, поэтому добавление RTL-языка не требует нового route tree; отдельный RTL-дизайн пока не внедрён.

`frontend/src/shared/i18n/metadata.ts` строит canonical и `hreflang` из `supportedLocales` и `https://www.auth.d9911`, включая `x-default` для `ru`. Публичные индексируемые страницы используют локализованные metadata fields и alternates. Auth, recovery и private pages имеют `noindex`; recovery routes дополнительно получают существующие `Cache-Control`, `Referrer-Policy` и `X-Robots-Tag` headers.

## Добавление испанского языка

Добавление `es` не требует копирования страниц, компонентов или route definitions:

1. Добавьте `es` в `i18nConfig.supportedLocales` в `frontend/src/shared/i18n/config.ts`.
2. Создайте каталог `frontend/src/locales/es`.
3. Создайте в нём все обязательные namespaces из `i18nConfig.namespaces`.
4. Заполните каждый JSON теми же ключами, типами и interpolation parameters, что и русский эталон; при необходимости добавьте только display metadata языка в `localeMetadataOverrides`.
5. Запустите locale parity test и исправьте все отличия.
6. Запустите приложение и проверьте `/es/` и один вложенный URL, например `/es/sign-in`.
7. Проверьте переключатель в обе стороны, включая сохранение pathname, query и hash.
8. Запустите typecheck, lint, production build и route tests.

## Проверка

Репозиторий требует Node 24 и Yarn 1.22.x. Основные команды из корня проекта:

```bash
node tests/i18n-config-and-routing.mjs
node tests/i18n-locale-routing-contract.mjs
node tests/i18n-locales-parity.mjs
node tests/i18n-used-keys.mjs
node tests/i18n-source-coverage.mjs
NODE_ENV=production node tests/i18n-production-fallback.mjs
node tests/i18n-auth-integration.mjs
node tests/i18n-metadata.mjs
node tests/check-source.mjs
make check
# With a production frontend already running:
I18N_BASE_URL=http://127.0.0.1:5178 make check-i18n-http
```

Frontend-проверки:

```bash
cd frontend
yarn typecheck
yarn lint
yarn build
```

HTTP/browser smoke должен подтвердить:

- redirect `/` и `/sign-in` на выбранный locale;
- русский UI на `/ru/sign-in` и английский на `/en/sign-in`;
- canonical redirect неподдерживаемого locale-like сегмента на выбранный поддерживаемый язык;
- сохранение pathname/query/hash в switcher;
- сохранение локализованного `next` на protected route;
- отсутствие locale prefix у API/static routes;
- сохранение locale после reload;
- отсутствие hydration и missing-key ошибок в console.

## Частые ошибки

- Добавлять язык в компонент или proxy отдельно от `i18nConfig`.
- Использовать текст перевода как key.
- Строить внутренний `<Link>` из `ROUTES` без `getLocalizedRoutes(locale)`.
- Определять текущий язык из cookie/localStorage вместо первого URL-сегмента.
- Вызывать `i18n.changeLanguage` без смены URL.
- Переключать язык через переход на корень и терять query/hash.
- Локализовать `/api`, OAuth callback, static assets или service worker.
- Доверять `next` без `optionalNextPath`/`safeNextPath`.
- Показывать raw GraphQL message при наличии стабильного error code.
- Добавлять interpolation placeholder только в одну локаль.
- Конкатенировать pluralized предложение вместо передачи `count`.
- Импортировать все locale JSON в initial client bundle.
- Использовать context-dependent `Trans` в Server Component вместо `TransWithoutContext` с явно переданными `t` и `i18n`.

## Известные ограничения

- Статические `manifest.json` и `offline.html` исключены из locale routing и остаются глобальными англоязычными fallback-assets; их перевод потребует отдельной стратегии для статических PWA-файлов.
- Backend-generated и provider-generated сообщения не переводятся автоматически. Frontend локализует только известные error codes и собственный UI.
- Имена стран, регионов, городов и другие server-generated данные отображаются как получены от API; отдельной локализованной модели данных нет.
- Locale metadata поддерживает `dir`, но отдельная RTL-вёрстка не реализована, пока RTL-язык не добавлен.
