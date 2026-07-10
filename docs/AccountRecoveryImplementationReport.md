# Отчет о реализации восстановления аккаунта

Дата: 2026-07-10

## Назначение документа

Этот документ фиксирует фактически выполненные изменения по восстановлению
аккаунта и связанному auth-flow. Он дополняет:

- `docs/AccountRecovery.md` с описанием рабочего контракта;
- `docs/account-recovery-map.mmd` с диаграммой потоков;
- `docs/auth-env-contract.md` с требованиями к окружению;
- `docs/auth-parameters-map.mmd` с параметрами auth-интеграций.

В отчете перечислены реализованные сценарии, причины найденных ошибок,
измененные архитектурные области, проверки и известные ограничения.

## Итог

Реализовано полноценное восстановление аккаунта через email и Telegram:

1. Пользователь выбирает канал восстановления на `/forgot-password`.
2. Email-flow отправляет одноразовую ссылку без раскрытия существования
   аккаунта.
3. Telegram-flow подтверждает пользователя через ранее привязанный Telegram.
4. Ссылка или Telegram-подтверждение обмениваются на короткоживущий recovery
   grant.
5. Recovery grant сохраняется в `httpOnly` cookie и недоступен клиентскому
   JavaScript.
6. Новый пароль проверяется одинаковой allowlist-политикой на frontend и
   backend.
7. После смены пароля старые access/refresh-сессии становятся недействительными.
8. Email-flow возвращает пользователя на страницу входа с сохраненным `next`.
9. Telegram-flow создает новую сессию после успешной смены пароля.
10. Включенная двухфакторная аутентификация сохраняется после восстановления.

## Найденная причина потери авторизации

Во время browser smoke была обнаружена дополнительная ошибка auth hydration.

`EditProfileForm` определял необходимость загрузки стран по пустому массиву.
Пустой корректный результат воспринимался как состояние "еще не загружено".
Это повторно запускало `loadCountriesThunk`, создавало серию GraphQL-запросов и
могло приводить к `429 Too Many Requests`. Ошибка параллельного `me`-запроса
после этого переводила Redux auth state в `guest`, поэтому пользователь видел
повторный redirect на login или пустое состояние после успешного входа.

Исправление:

- в location/profile state добавлены отдельные признаки завершенной загрузки;
- `EditProfileForm` больше не использует пустой массив как признак hydration;
- `loadMeThunk` получил `condition`, запрещающий параллельный повторный запуск;
- auth state больше не теряется из-за request loop после входа.

Клик по нику авторизованного пользователя обрабатывается в `HeaderMain` и
открывает account menu. Переход на `/profile/edit` выполняется только через
пункт `Profile`. Сам клик по нику не отправляет пользователя на login.

## Email recovery

### Запрос восстановления

GraphQL mutation:

```graphql
requestPasswordReset(input: RequestPasswordResetInput!): Boolean!
```

Реализованное поведение:

- email нормализуется через `trim().toLowerCase()`;
- ответ всегда одинаковый для существующего, отсутствующего и synthetic email;
- для пользователя сохраняется только SHA-256 hash случайного токена;
- ранее выданные reset-токены пользователя инвалидируются;
- срок действия ссылки составляет 60 минут;
- `next` проходит проверку как внутренний безопасный путь;
- ошибка SMTP записывается без email и токена и не меняет публичный ответ.

### Обмен ссылки

GraphQL mutation:

```graphql
exchangePasswordResetToken(token: String!): RecoveryGrantPayload!
```

Одноразовый email token атомарно поглощается и заменяется recovery grant со
сроком действия 15 минут. В базе хранится SHA-256 hash grant, а не исходное
значение.

Frontend GraphQL proxy удаляет `recoveryToken` из JSON-ответа и сохраняет его в
cookie со следующими параметрами:

- `httpOnly: true`;
- `sameSite: strict`;
- `path: /api/graphql`;
- `maxAge: 15 минут`;
- `secure` управляется `COOKIE_SECURE`.

Токен удаляется из URL после обмена. Recovery-страницы используют
`Cache-Control: no-store`, `Referrer-Policy: no-referrer` и
`X-Robots-Tag: noindex, nofollow`.

### Завершение восстановления

GraphQL mutation:

```graphql
completePasswordReset(input: CompletePasswordResetInput!): CompletePasswordResetPayload!
```

Frontend не отправляет recovery token из React state. Proxy читает `httpOnly`
cookie и добавляет токен в GraphQL input на серверной стороне.

Backend выполняет следующие действия:

1. Повторно валидирует новый пароль.
2. Атомарно поглощает recovery grant.
3. Проверяет пользователя и сохраненную версию `authVersion`.
4. Создает bcrypt hash нового пароля.
5. Обновляет пароль и увеличивает `authVersion`.
6. Отзывает все refresh-токены пользователя.
7. Инвалидирует оставшиеся recovery grants.
8. Сохраняет существующую настройку 2FA.
9. Пытается отправить уведомление о смене пароля на contactable email.

Для email-flow текущие auth cookies очищаются. Пользователь перенаправляется на
`/sign-in?recovered=1&next=...`, а после входа возвращается по сохраненному
безопасному пути.

## Telegram recovery

Добавлены GraphQL mutations:

```graphql
telegramRecoveryStart: TelegramRecoveryStartPayload!
telegramRecoveryPoll(token: String!): TelegramRecoveryPollPayload!
```

Сценарий:

1. Backend создает ticket с назначением `recovery` и шестизначным кодом.
2. UI открывает deep link Telegram-бота и показывает код подтверждения.
3. Bot подтверждает Telegram-пользователя и завершает ticket.
4. Poll проверяет ticket и ищет аккаунт только по уже привязанному
   `telegramId`.
5. Если привязки нет, возвращается `not_linked`. Новый пользователь не
   создается и аккаунты автоматически не связываются.
6. Для найденного пользователя выпускается recovery grant.
7. После смены пароля Telegram-flow выпускает новую access/refresh-сессию.

Telegram tickets вынесены за пределы process memory:

- MongoDB: `MongoTelegramTicketRepository`;
- SQLite: `SqliteTelegramTicketRepository`;
- общий контракт: `TelegramTicketRepository`.

Ticket имеет purpose, status, expiration, confirmation code и подтвержденного
Telegram-пользователя. Операции завершения и поглощения используют условные
атомарные update-запросы.

## Recovery email и внешние аккаунты

В `ConnectedAccounts` добавлена возможность:

- указать новый recovery email;
- запросить код подтверждения;
- подтвердить смену email;
- запустить password reset для текущего contactable email.

Synthetic email, созданный для OAuth-аккаунта без доступного адреса, не
показывается пользователю как recovery email и не используется для писем.

GitHub может сопоставить существующий аккаунт по email только тогда, когда
GitHub сообщил, что адрес подтвержден. Telegram recovery доступен только после
явной привязки Telegram к существующему аккаунту.

## Двухфакторное восстановление

При включении 2FA backend теперь создает восемь recovery codes:

- исходные коды возвращаются только один раз;
- UI показывает их после настройки и предоставляет кнопку копирования;
- в базе сохраняются только hashes;
- каждый код можно использовать вместо одного TOTP challenge;
- использованный hash удаляется атомарно;
- повторное использование того же кода отклоняется;
- password recovery не отключает 2FA.

В форме входа добавлен явный режим ввода recovery code вместо TOTP.

## Password policy

Frontend и backend используют одинаковый regex:

```ts
/^[A-Za-zÑñ0-9!@#$%^&*()_+=.,?:~\[\]]{8,50}$/
```

Разрешены:

- английские буквы `A-Z` и `a-z`;
- `Ñ` и `ñ`;
- цифры `0-9`;
- `! @ # $ % ^ & * ( ) _ + = . , ? : ~ [ ]`;
- длина от 8 до 50 символов.

Форма содержит `password` и `confirmPassword`, отдельные доступные кнопки
показать/скрыть пароль, inline-ошибки и блокировку submit при невалидных данных.

Regex используется только как UX и allowlist validation. Он не рассматривается
как защита базы данных.

## Сессии и токены

В access и refresh JWT добавлено поле `authVersion`.

При каждом использовании access token GraphQL context сравнивает версию JWT с
версией пользователя. Refresh flow делает такую же проверку перед ротацией.

После смены пароля `authVersion` увеличивается. Поэтому ранее выпущенный access
token отклоняется, даже если его cryptographic expiration еще не наступил.
Все refresh-токены дополнительно отзываются в repository.

Сырые access, refresh, email и recovery tokens не сохраняются в базе. Для
случайных bearer tokens используется SHA-256 hash. Пароль хешируется отдельно
через `bcryptjs` с 10 salt rounds.

## Защита API

Добавлены или расширены следующие меры:

- server-side password validation для регистрации и восстановления;
- одинаковый публичный ответ reset request против account enumeration;
- IP rate limit для чувствительных GraphQL operations;
- отдельный identifier bucket по SHA-256 email;
- проверка Telegram HMAC signature;
- проверка GitHub OAuth CSRF state;
- ограничение размера request body;
- CORS allowlist;
- security headers;
- структурированный auth audit без email, password, raw token и cookie;
- production-проверка обязательных URL и provider settings.

SQLite использует `better-sqlite3.prepare(...).run/get` с positional или named
parameters. Пароль, email и token не конкатенируются в SQL. Динамические имена
полей ограничены hardcoded ветками repository.

MongoDB использует Mongoose models, structured filters и `$set`/`$inc` updates.
GraphQL schema также отклоняет объекты вместо строк до вызова use case.

## Архитектурные изменения

### Backend

| Область | Изменение |
| --- | --- |
| `PasswordUseCases` | Email token, recovery grant, password reset, email change |
| `AuthUseCases` | Оркестрация email/Telegram recovery, session issue, 2FA codes |
| GraphQL schema/resolvers | Новые recovery, email-change и Telegram operations |
| JWT/context | `authVersion` в access/refresh tokens и runtime-проверка |
| Mongo/SQLite repositories | Recovery grants, Telegram tickets, atomic password update |
| `MailService` | Reset link и уведомление о смене пароля |
| `security.ts` | IP/identifier rate limits для auth operations |
| `ConsoleAuthAudit` | Структурированные allowlisted security events |

### Frontend

| Область | Изменение |
| --- | --- |
| `/forgot-password` | Выбор email или Telegram recovery |
| `/reset-password` | Обмен ссылки, два password-поля, validation, redirect |
| GraphQL proxy | Recovery cookie, token stripping/injection, auth cookie lifecycle |
| `ConnectedAccounts` | Добавление/подтверждение recovery email и reset action |
| `SignInForm` | Вход с TOTP или одноразовым 2FA recovery code |
| `TwoFactorSetup` | Одноразовый показ и копирование восьми recovery codes |
| Auth/profile/location slices | Защита hydration от повторных запросов |
| `HeaderMain` | Клик по нику открывает account menu и профиль |

### Документация и тесты

Добавлены или обновлены:

- `docs/AccountRecovery.md`;
- `docs/account-recovery-map.mmd`;
- `docs/auth-env-contract.md`;
- `docs/auth-parameters-map.mmd`;
- `docs/project-logic-map.mmd`;
- `docs/ProjectImprovementPlan.md`;
- source contract tests;
- compiled use-case tests;
- GraphQL/SQLite smoke tests;
- OWASP-style security audit;
- hydration regression test;
- Telegram persistence tests;
- 2FA recovery-code tests.

## Runtime и сборка

Backend Dockerfile уже использовал Node.js 24. Локальный runtime ранее не был
закреплен, поэтому `better-sqlite3` мог собраться под Node ABI 127, а Make
запустить audit под ABI 137. Это приводило к `ERR_DLOPEN_FAILED`.

Выполнено:

- добавлен `.nvmrc` со значением `24`;
- root/backend/frontend package metadata ограничены Node.js 24;
- package manager закреплен как Yarn `1.22.22`;
- native backend dependencies пересобраны Yarn под Node.js 24;
- README приведен к фактическому runtime;
- `.playwright-cli/` добавлен в `.gitignore`;
- временные Playwright snapshot YAML удалены из рабочего набора.

## Выполненные проверки

### Полный check

```bash
make check
```

Результат: успешно. Команда включает source contracts, backend/frontend
typecheck и compiled account-recovery tests.

### GraphQL/SQLite smoke

```bash
make backend-test-sqlite
```

Результат: `34 passed, 0 failed`.

Проверены sign-up, email confirmation, sign-in, refresh rotation, profile,
2FA, email recovery, одноразовость token/grant, `authVersion`, отзыв старых
сессий, новый пароль и одноразовый 2FA recovery code.

### Security audit

```bash
make security-audit
```

Результат: `25 passed, 0 failed`.

Проверены protected resolvers, JWT tampering, отсутствие password/2FA secret в
API, NoSQL operator injection, account enumeration, password policy, refresh
rotation, Telegram signature, GitHub state, CORS, body limit, security headers
и rate limiting.

### Lint и build

Успешно выполнены:

```bash
cd backend && yarn lint
cd frontend && yarn lint
cd backend && yarn build
cd frontend && yarn build
```

Frontend production build создал маршруты `/forgot-password`,
`/reset-password`, `/sign-in`, `/profile/edit` и `/api/graphql` без TypeScript
или build errors.

### Docker и runtime

Штатный Mongo stack пересобран и запущен через `make doc-mongo`.

Подтверждено:

- Mongo container healthy;
- backend container healthy;
- `GET http://localhost:3010/health` возвращает `status: ok`, `db: mongo`;
- `HEAD http://localhost:5178/forgot-password` возвращает `200 OK`;
- frontend доступен на `http://localhost:5178/`.

### Browser smoke

Проверено в браузере на desktop и mobile viewport:

- email reset request и generic success state;
- Telegram provider-disabled state;
- успешный обмен reset link;
- удаление token из URL;
- запрещенный символ `/` в пароле;
- несовпадающие пароли;
- show/hide для обоих password-полей;
- успешный reset и redirect с сохраненным `next`;
- вход новым паролем и возврат на `/profile/edit`;
- redirect гостя с защищенного профиля на login;
- открытие account menu по клику на ник авторизованного пользователя;
- отсутствие повторного auth redirect после hydration;
- показ восьми 2FA recovery codes;
- одноразовый вход с recovery code.

## Что не подтверждено полностью

Следующие ограничения зафиксированы явно:

- финальный автоматизированный прогон использовал console mail transport, а не
  реальную SMTP-доставку;
- реальное подтверждение recovery через Telegram-бота не автоматизировалось;
- полный recovery lifecycle выполнен на SQLite;
- Mongo repositories скомпилированы и Mongo runtime здоров, но отдельного
  автоматизированного Mongo recovery E2E пока нет;
- rate-limit buckets находятся в памяти процесса, поэтому нескольким backend
  replicas нужен общий limiter, например Redis;
- Telegram `getUpdates` long-poller должен работать в одном active worker или
  быть заменен webhook/leader-election схемой;
- auth audit пока отправляется только в structured console output и не связан
  с внешним SIEM/alerting sink.

## Основные файлы реализации

Backend:

- `backend/src/modules/auth/use-cases/PasswordUseCases.ts`;
- `backend/src/modules/auth/use-cases/AuthUseCases.ts`;
- `backend/src/app/graphql/schema.ts`;
- `backend/src/app/graphql/resolvers.ts`;
- `backend/src/app/graphql/context.ts`;
- `backend/src/modules/auth/domain/RecoveryGrantRepository.ts`;
- `backend/src/modules/auth/domain/TelegramTicketRepository.ts`;
- `backend/src/infrastructure/database/mongo/MongoRecoveryGrantRepository.ts`;
- `backend/src/infrastructure/database/mongo/MongoTelegramTicketRepository.ts`;
- `backend/src/infrastructure/database/sqlite/SqliteRecoveryGrantRepository.ts`;
- `backend/src/infrastructure/database/sqlite/SqliteTelegramTicketRepository.ts`;
- `backend/src/shared/middlewares/security.ts`;
- `backend/src/modules/auth/services/ConsoleAuthAudit.ts`.

Frontend:

- `frontend/src/features/PasswordResetForm/PasswordResetForm.tsx`;
- `frontend/src/features/PasswordResetForm/TelegramRecoveryPanel.tsx`;
- `frontend/src/features/password-reset/api/passwordResetApi.ts`;
- `frontend/src/shared/api/requestHandler.ts`;
- `frontend/src/features/ConnectedAccounts/ConnectedAccounts.tsx`;
- `frontend/src/features/TwoFactorSetup/TwoFactorSetup.tsx`;
- `frontend/src/features/SignInForm/SignInForm.tsx`;
- `frontend/src/processes/store/slices/authSlice.ts`;
- `frontend/src/processes/store/slices/locationSlice.ts`;
- `frontend/src/processes/store/slices/profileSlice.ts`;
- `frontend/src/widgets/HeaderMain/HeaderMain.tsx`.

## Команды для повторной проверки

```bash
nvm use
yarn --version
make check
make backend-test-sqlite
make security-audit
make doc-mongo
```

Ожидаемый runtime: Node.js 24 и Yarn 1.22.22.
