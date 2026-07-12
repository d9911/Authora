# Authora authentication skeleton roadmap

Дата аудита и реализации: 2026-07-12.

## Цель и границы

Задача реализуется как расширение существующего auth-flow, а не как второй модуль
авторизации. Backend-контракт, GraphQL transport, Redux store, URL-based locale,
дизайн форм и текущая политика регистрации сохранены. Новые зависимости и mock-adapter
не нужны: фактический backend предоставляет все требуемые операции.

## Подтверждённая архитектура

- Framework: Next.js 16 App Router, React 19, TypeScript.
- Маршруты: `frontend/src/app/[locale]`; locale обязателен в первом URL-сегменте.
- Route guard и guest redirect: `frontend/src/proxy.ts`.
- UI state: Redux Toolkit в `frontend/src/processes/store`.
- Browser API: `frontend/src/features/auth-api/authApi.ts` и
  `frontend/src/entities/user/api/userApi.ts`.
- Transport: browser выполняет только `POST /api/graphql`; Next proxy пересылает запрос
  на backend `POST /graphql`.
- Session storage: access/refresh JWT находятся в `HttpOnly`, `SameSite=Lax` cookies;
  JavaScript не сохраняет их в `localStorage` или `sessionStorage`.
- Backend: Express 5, GraphQL, `AuthUseCases`, MongoDB/SQLite repositories.

Текущий основной поток:

```text
localized page/form
  -> Redux thunk
  -> typed auth API function
  -> POST /api/graphql
  -> Next session proxy (HttpOnly cookies)
  -> POST backend /graphql
  -> resolver -> AuthUseCases -> repository
  -> Redux user/status update
  -> validated localized redirect
```

## Страницы и формы

| Сценарий | Route | Реализация | Статус |
| --- | --- | --- | --- |
| Вход | `/:locale/sign-in` | `SignInForm` | Готово |
| Регистрация | `/:locale/sign-up` | `SignUpForm` | Готово |
| Запрос восстановления | `/:locale/forgot-password` | `PasswordResetForm` request mode | Готово |
| Новый пароль | `/:locale/reset-password` | `PasswordResetForm` reset mode | Готово |
| Подтверждение email | `/:locale/confirm-email` | `ConfirmEmailForm` | Готово |
| Выход | `/:locale/logout` | `LogoutAction` | Добавлено |

Формы уже используют общие `InputMain`, `PasswordInput`, `OtpCodeInput`,
`ButtonMain`, localized validation/errors, loading/disabled states и доступное
show/hide password. Пароль существует только в локальном состоянии формы и не
сохраняется.

## Фактический API-контракт

Имена из продуктового требования сопоставлены с существующим GraphQL API; aliases и
REST endpoints не добавляются.

| Требуемая операция | Фактическая операция |
| --- | --- |
| `login` | `signIn(input: SignInInput!): AuthPayload!` |
| `register` | `signUp(input: SignUpInput!): AuthPayload!` |
| `logout` | `logout(refreshToken: String): Boolean!` |
| `refreshToken` | `refreshToken(input: RefreshTokenInput!): AuthPayload!` |
| `getCurrentUser` | `Query.me: User` |
| `forgotPassword` | `requestPasswordReset(input: RequestPasswordResetInput!): Boolean!` |
| `resetPassword` | `exchangePasswordResetToken` затем `completePasswordReset` |
| `verifyEmail` | `confirmEmailCode(email: String!, code: String!): Boolean!` |

Backend возвращает токены по существующему контракту для server-to-server клиентов.
Next proxy извлекает их, записывает cookies и удаляет token fields до отправки ответа
browser-коду. Поэтому token fields должны оставаться в GraphQL selection set frontend
API, хотя JavaScript их не получает.

## Состояние авторизации

Каноническое состояние остаётся минимальным:

```text
user
status: idle | loading | authenticated | guest
error / errorCode
twoFactorToken
```

`isAuthenticated` и `isLoading` являются derived selectors, а не дублирующими полями.
`AuthBootstrap` запускает `loadMeThunk()` один раз при состоянии `idle` независимо от
наличия header. `loadMeThunk` восстанавливает пользователя после reload; rejected load
очищает устаревшего пользователя. Logout очищает локальное состояние и при success, и
при transport/backend failure. Внутренний `currentLoadMeRequestId` не позволяет позднему
bootstrap-ответу восстановить пользователя после login/logout transition.

## Route policy

- Public: home, countries, location pages, about и UI-kit.
- Private prefix: `/profile`; запрос без session cookie перенаправляется на localized
  sign-in с percent-encoded `next`.
- Guest-only: `/sign-in` и `/sign-up`; наличие access или refresh cookie перенаправляет
  на localized profile.
- Session action: `/logout`; доступен напрямую и всегда возвращает пользователя на
  localized home.
- `optionalNextPath` принимает только same-origin относительные пути, отвергает `//`
  и внешние origins.

При server-side redirect сохраняются pathname и query. URL fragment не передаётся в
HTTP request и поэтому недоступен Next proxy при первом открытии private route; reactive
browser redirect после `401` сохраняет pathname, query и hash через `window.location`.

Cookie presence на edge guard является только предварительной навигационной проверкой.
Реальная authentication/authorization остаётся на backend; просроченная cookie не даёт
доступ к данным.

## Refresh и завершение сессии

Browser-side reactive refresh уже использует общую Promise и повторяет исходный GraphQL
запрос не более одного раза. В этой итерации добавлен server-side coordinator для
proactive refresh Next proxy:

- одновременные запросы с одним refresh token используют одну Promise;
- ключ карты — SHA-256 токена, raw token не логируется и не используется как key;
- completed/rejected Promise удаляется из карты;
- invalid refresh очищает обе auth cookies;
- logout пытается отозвать refresh token на backend и всегда удаляет browser cookies,
  включая случай недоступного backend;
- logout блокирует refresh по тому же ключу, ожидает выполняющуюся rotation и передаёт
  backend уже rotated refresh token для отзыва, если rotation успела начаться.

Для покрытия response-order race coordinator удерживает только rotated refresh token
(без access token) в process memory не более 60 секунд; значение не логируется.

Coordinator действует в пределах одного Next.js process. Межпроцессная координация
требует атомарной backend rotation и не подменяется frontend-кодом.

## Roadmap

### P0 — инвентаризация и сохранение контракта

- [x] Подтвердить framework, routes, API client, Redux state и cookie owner.
- [x] Сопоставить требуемые API-имена с фактической GraphQL schema.
- [x] Подтвердить отсутствие token storage в browser storage.
- [x] Не создавать mock-adapter при наличии backend-контракта.

### P1 — минимальный рабочий skeleton

- [x] Вынести session bootstrap из header в process-level `AuthBootstrap`.
- [x] Добавить selectors `selectAuthUser`, `selectAuthStatus`,
  `selectIsAuthenticated`, `selectAuthIsLoading`, `selectAuthError`,
  `selectAuthErrorCode`.
- [x] Очищать stale user при неуспешной начальной проверке.
- [x] Добавить localized logout page и fail-closed local logout state.
- [x] Всегда удалять auth cookies при logout request.
- [x] Добавить single-flight proactive refresh в Next proxy.
- [x] Исключить bootstrap-after-logout и refresh-after-logout races в одном process.

### P2 — regression и runtime coverage

- [x] Login success и `INVALID_CREDENTIALS` failure на локальном backend.
- [x] Initial anonymous `me` и authenticated `me`.
- [x] Private route redirect и сохранение `next`.
- [x] Guest-only route redirect.
- [x] Logout и невозможность повторно использовать отозванный refresh token.
- [x] Истёкший access token возвращает `INVALID_TOKEN`.
- [x] Один refresh для нескольких одновременных запросов в одном Next process.
- [x] Один browser refresh и один retry на каждый из нескольких одновременных `401`.
- [x] Выполнить полный `make test NO_COLOR=1` после production build.

### P3 — подтверждённые последующие улучшения

- [ ] Сделать backend refresh consumption атомарным в MongoDB и SQLite; сейчас
  `findValidByHash` и `revokeByHash` выполняются отдельно.
- [ ] Добавить distributed single-flight/atomic rotation для нескольких Next/backend
  экземпляров; in-process Map не координирует разные процессы.
- [ ] Валидировать production startup: `COOKIE_SECURE=true`, TLS termination и
  непустые уникальные `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`.
- [ ] Перевести email OTP с `findValid + markUsed` на уже предусмотренный repository
  `consumeValid` после отдельного regression-теста гонки.

Эти P3-пункты не меняются в рамках frontend skeleton, потому что требуют отдельного
backend/security решения и потенциальной миграции repository semantics.

## Проверки

| Требование | Автоматическая проверка |
| --- | --- |
| Успешный/неуспешный login | `tests/test-refresh-flow.mjs` |
| Начальная загрузка user/guest | `tests/auth-session-skeleton.mjs`, `tests/test-refresh-flow.mjs` |
| Private route и `next` | `tests/i18n-http-routing.mjs` |
| Guest-only route | `tests/i18n-http-routing.mjs` |
| Logout | `tests/auth-session-skeleton.mjs`, `tests/test-refresh-flow.mjs` |
| Истёкшая сессия | `tests/test-refresh-flow.mjs` |
| Concurrent proactive refresh/logout | `tests/auth-session-skeleton.mjs` |
| Concurrent browser `401` refresh | `tests/graphql-client-refresh.test.mjs` |
| Общая регрессия | `make test NO_COLOR=1` |

Последний полный локальный прогон 2026-07-12: 52 PASS, 0 WARN, 0 FAIL;
общая продолжительность 97.38 секунды. Production build включил routes `/ru/logout`
и `/en/logout`; HTTP integration подтвердил cookie stripping, proxy logout, backend
revocation и guest/private redirects.

## Deployment и rollback

Deployment не требует изменения backend schema или базы. Frontend должен использовать
существующие `BACKEND_INTERNAL_URL`, cookie names и `COOKIE_SECURE=true` за HTTPS.

Rollback выполняется возвратом frontend-файлов этой итерации. Backend migration и очистка
данных не требуются. При rollback исчезнет server-side refresh deduplication и route
`/:locale/logout`, но существующие sign-in/sign-up/reset/email flows продолжат работать.
