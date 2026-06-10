# План разработки приложения с авторизацией, профилем и публичной информацией
## 1. Цель проекта
Разработать fullstack-приложение с авторизацией, профилем пользователя и публичными информационными страницами.
Приложение должно поддерживать:
- регистрацию и вход по email/password;
- подтверждение email;
- восстановление пароля через email;
- JWT-авторизацию через accessToken и refreshToken;
- двухфакторную защиту через speakeasy + qrcode;
- регистрацию/вход через GitHub;
- возможность авторизации через Telegram ID;
- редактирование профиля пользователя;
- публичные страницы стран, регионов и городов;
- поддержку трёх типов БД: MongoDB, PostgreSQL через Sequelize и SQLite;
- запуск backend и frontend через Makefile и Docker Compose.

# 2. Технологический стек
## Backend
Порт backend:
env BACKEND_PORT=3010
Используемые технологии:
- Node.js
- Express
- TypeScript
- GraphQL
- PM2
- bcrypt
- jsonwebtoken
- speakeasy
- qrcode
- nodemailer
- GitHub OAuth
- Telegram auth/bot flow
- MongoDB
- PostgreSQL + Sequelize
- SQLite
- swagger
Email-настройки:
env OWNER_EMAIL=test@d9911.org SMTP_HOST=smtp.mail.ru SMTP_PORT=465 SMTP_USER=d.9911@mail.ru SMTP_PASS=
## Frontend
Порт frontend:
env FRONTEND_PORT=5178
Используемые технологии:
- Next.js
- TypeScript
- Redux
- Redux Thunk
- Axios
- Sass
- PWA
- next.config.mjs
- proxy через frontend/src/app/api

# 3. Архитектура backend
Backend строится по подходу:
text Clean Architecture + Feature Modules / DDD-lite
Основная идея:
- бизнес-логика не зависит от Express, GraphQL и конкретной базы данных;
- модули разделены по фичам;
- инфраструктура подключается через адаптеры;
- можно переключать БД через .env;
- слой use cases отвечает за бизнес-сценарии.
## Предлагаемая структура backend
```
backend/
  src/
    app/
      server.ts
      express.ts
      graphql.ts
      pm2.ts

    config/
      env.ts
      database.ts
      mail.ts
      jwt.ts
      oauth.ts

    core/
      errors/
      utils/
      types/
      constants/

    modules/
      auth/
        domain/
        use-cases/
        infrastructure/
        graphql/
        services/
        swagger.ts

      user/
        domain/
        use-cases/
        infrastructure/
        graphql/
        swagger.ts

      profile/
        domain/
        use-cases/
        infrastructure/
        graphql/
        swagger.ts

      location/
        country/
        region/
        city/
        swagger.ts

      mail/
        services/
        templates/
        swagger.ts

      two-factor/
        services/
        graphql/
        swagger.ts


    infrastructure/
      database/
        mongo/
        postgres/
        sqlite/
        repositories/

      mail/
      jwt/
      oauth/
      telegram/

    shared/
      middlewares/
      validators/
      decorators/
      helpers/
      errors/apiError.ts // код всех ошибок котоые могут прийти на фронт
      swagger/ // для анализа всех файлов

  package.json
  tsconfig.json
  ecosystem.config.js
```


# 4. Модели данных
## User
Пользователь хранит основные данные для входа и идентификации.
ts class User { public id!: number; public name?: string; public email!: string; public password?: string; public nickname?: string; public phoneNumber?: string; public telegramId?: string; public avatarUrl?: string; public createdAt!: Date; public updatedAt!: Date; }
Особенности:
- email обязателен;
- email может быть неподтверждённым;
- password может отсутствовать, если пользователь зарегистрирован через GitHub, Telegram или другой внешний ресурс;
- telegramId можно использовать для Telegram-авторизации;
- avatarUrl хранится в базе как ссылка или путь к файлу.

## Profile
Профиль содержит расширенные данные пользователя.
ts class Profile { public id!: number; public userId!: number; public bio?: string; public isVerified!: boolean; public description?: string; public coverSrc?: string; public cityId?: number; public dateOfBirth?: Date; public gender?: string; public address?: string; public timezone?: string; public createdAt!: Date; public updatedAt!: Date; }
Особенности:
- userId связан с User;
- isVerified показывает подтверждён ли email;
- cityId связывает профиль с городом;
- coverSrc используется для фонового изображения профиля.

## City
ts export interface CityAttributes { id: number; name: string; countryId?: number; createdAt?: Date; updatedAt?: Date; }
Также рекомендуется добавить модели:
text Country Region City
Связи:
text Country 1 → N Region Region 1 → N City Country 1 → N City User 1 → 1 Profile City 1 → N Profile

# 5. Работа с базами данных
Приложение должно поддерживать 3 типа БД:
text MongoDB PostgreSQL через Sequelize SQLite
Выбор БД происходит через .env.
Пример:
env DB_TYPE=postgres
Возможные значения:
env DB_TYPE=mongo DB_TYPE=postgres DB_TYPE=sqlite
## Подход к реализации
Для каждой сущности создаётся общий интерфейс репозитория:
ts interface UserRepository { create(data: CreateUserDto): Promise<User>; findById(id: number): Promise<User | null>; findByEmail(email: string): Promise<User | null>; update(id: number, data: UpdateUserDto): Promise<User>; }
Затем создаются реализации:
text MongoUserRepository PostgresUserRepository SqliteUserRepository
Use case работает только с интерфейсом, а не с конкретной базой.

# 6. Авторизация
## Основные сценарии
Нужно реализовать:
1. Регистрация по email/password.
2. Подтверждение email.
3. Вход по email/password.
4. Обновление accessToken через refreshToken.
5. Logout.
6. Восстановление пароля.
7. Смена пароля.
8. Регистрация/вход через GitHub.
9. Авторизация через Telegram.
10. Подключение 2FA.
11. Проверка 2FA при входе.

## JWT
Используются два токена:
text accessToken — короткоживущий токен refreshToken — долгоживущий токен
Пример .env:
env JWT_ACCESS_SECRET= JWT_REFRESH_SECRET= JWT_ACCESS_EXPIRES=15m JWT_REFRESH_EXPIRES=30d
При входе пользователь получает:
ts { accessToken: string; refreshToken: string; user: User; }

## bcrypt
Пароли нельзя хранить в открытом виде.
При регистрации:
text password → bcrypt hash → database
При входе:
text password → bcrypt.compare → login

## Email confirmation
После регистрации пользователь получает письмо со ссылкой подтверждения.
Пример flow:
text Пользователь регистрируется ↓ Создаётся user ↓ Создаётся profile с isVerified = false ↓ Генерируется emailVerificationToken ↓ Отправляется письмо ↓ Пользователь переходит по ссылке ↓ profile.isVerified = true

## Password recovery
Flow восстановления пароля:
text Пользователь вводит email ↓ Backend проверяет пользователя ↓ Генерирует resetPasswordToken ↓ Отправляет письмо ↓ Пользователь открывает ссылку ↓ Вводит новый пароль ↓ Backend хэширует пароль ↓ Старые refreshToken инвалидируются

# 7. GitHub OAuth
Нужно реализовать регистрацию и вход через GitHub.
Flow:
text Пользователь нажимает "Войти через GitHub" ↓ Frontend отправляет пользователя на GitHub OAuth ↓ GitHub возвращает code ↓ Backend меняет code на access_token GitHub ↓ Backend получает данные пользователя ↓ Если email найден — логин ↓ Если email не найден — создать пользователя ↓ Вернуть accessToken и refreshToken
Важно:
- email остаётся обязательным;
- если GitHub не отдаёт email, нужно запросить email отдельно;
- если email не подтверждён в GitHub, в профиле можно оставить isVerified = false.

# 8. Telegram auth
Нужно предусмотреть авторизацию через Telegram ID.
Возможный подход:
text Пользователь пишет боту ↓ Бот получает telegramId ↓ Пользователь привязывает telegramId в профиле ↓ При входе через Telegram backend проверяет telegramId ↓ Если пользователь найден — выдаёт JWT
Также можно использовать Telegram Login Widget, если нужен вход через сайт.
Для безопасной реализации нужно проверять подпись данных Telegram, а не просто доверять telegramId.

# 9. Двухфакторная авторизация 2FA
Используются:
text speakeasy qrcode
## Flow подключения 2FA
text Пользователь авторизован ↓ Запрашивает включение 2FA ↓ Backend создаёт secret через speakeasy ↓ Backend создаёт QR-код через qrcode ↓ Frontend показывает QR-код ↓ Пользователь сканирует код в Google Authenticator / Authy ↓ Пользователь вводит код ↓ Backend проверяет код ↓ 2FA включается
## Flow входа с 2FA
text Пользователь вводит email/password ↓ Backend проверяет пароль ↓ Если 2FA выключена — сразу выдаёт токены ↓ Если 2FA включена — возвращает статус NEED_2FA ↓ Пользователь вводит 2FA-код ↓ Backend проверяет код ↓ Выдаёт accessToken и refreshToken

# 10. GraphQL API
Backend должен использовать GraphQL.
## Основные GraphQL-модули
text auth user profile country region city twoFactor
## Пример Query
graphql type Query { me: User user(id: ID!): User countries: [Country!]! country(id: ID!): Country region(id: ID!): Region city(id: ID!): City }
## Пример Mutation
graphql type Mutation { signUp(input: SignUpInput!): AuthPayload! signIn(input: SignInInput!): AuthPayload! refreshToken(input: RefreshTokenInput!): AuthPayload! logout: Boolean! requestPasswordReset(input: RequestPasswordResetInput!): Boolean! resetPassword(input: ResetPasswordInput!): Boolean! confirmEmail(token: String!): Boolean! enableTwoFactor: TwoFactorSetupPayload! confirmTwoFactor(code: String!): Boolean! disableTwoFactor(code: String!): Boolean! signInTwoFactor(input: SignInTwoFactorInput!): AuthPayload! updateProfile(input: UpdateProfileInput!): Profile! }

# 11. Frontend architecture
Frontend строится по FSD:
text Feature-Sliced Design
Обязательные слои:
text app processes pages widgets features entities shared
## Предлагаемая структура frontend
```
frontend/
  src/
    app/
      api/
        auth/
        profile/
        location/

      (auth)/
        login/
          page.tsx
        layout.tsx

      (private)/
        profile/
          edit/
            page.tsx

      (public)/
        about/
          page.tsx
        country/
          page.tsx
          [id]/
            page.tsx
        region/
          [id]/
            page.tsx
        city/
          [id]/
            page.tsx

      loading.tsx
      layout.tsx
      page.tsx

    processes/
      store/
        StoreProvider.tsx
        rootReducer.ts
        store.ts

    widgets/
      HeaderMain/
      FooterMain/
      ProfileCard/
      CountryList/
      RegionList/
      CityList/

    features/
      SignInForm/
      SignUpForm/
      LogoutButton/
      EditProfileForm/
      TwoFactorSetup/
      PasswordResetForm/
      GithubLoginButton/
      TelegramLoginButton/

    entities/
      user/
        model/
        api/
        ui/

      profile/
        model/
        api/
        ui/

      country/
        model/
        api/
        ui/

      region/
        model/
        api/
        ui/

      city/
        model/
        api/
        ui/

    shared/
      api/
        axiosInstance.ts
        graphqlClient.ts

      config/
      ui/
        ButtonMain/
        InputMain/
        ModalMain/
        LoaderMain/

      hooks/
      lib/
      types/
      styles/

    middleware.ts

  next.config.mjs
  package.json
  tsconfig.json
```
# 12. Страницы frontend
## Auth
text frontend/src/app/(auth)/login/page.tsx
Страница входа:
- email/password;
- GitHub login;
- Telegram login;
- переход на регистрацию;
- переход на восстановление пароля;
- ввод 2FA-кода, если backend вернул NEED_2FA.
text frontend/src/app/(auth)/layout.tsx
Обёртка для auth-страниц.
Важно: если нужна отдельная регистрация, лучше добавить:
text frontend/src/app/(auth)/sign-up/page.tsx

## Private
text frontend/src/app/(private)/profile/edit/page.tsx
Редактирование профиля:
- name;
- nickname;
- phoneNumber;
- avatarUrl;
- bio;
- description;
- coverSrc;
- cityId;
- dateOfBirth;
- gender;
- address;
- timezone.
Доступ только для авторизованного пользователя.

## Public
text frontend/src/app/(public)/about/page.tsx
Информация о сайте.
text frontend/src/app/(public)/country/page.tsx
Все страны.
text frontend/src/app/(public)/country/[id]/page.tsx
Конкретная страна со всеми регионами.
text frontend/src/app/(public)/region/[id]/page.tsx
Все города в регионе.
text frontend/src/app/(public)/city/[id]/page.tsx
Конкретный город.

## Main
frontend/src/app/page.tsx
Главная страница.
text frontend/src/app/loading.tsx
Глобальная загрузка.
frontend/src/app/layout.tsx
отсутствие страницы !
frontend/src/app/not-found.tsx
Глобальная обёртка:
- metadata;
- StoreProvider;
- HeaderMain;
- FooterMain;
- global styles.

# 13. Proxy через frontend/src/app/api
Для разработки закрываем прямые запросы к backend через proxy.
Пример:
универсальный пишим !!!
frontend/src/app/api/[...path].ts
frontend/src/app/api/proxy.ts а в низ логика из  import { proxyRequest } from '@/shared/api/requestHandler';

Frontend обращается не напрямую к backend, а к своему API route:
text Frontend component ↓ /api/graphql ↓ Backend GraphQL
Это удобно для:
- скрытия backend URL;
- работы с cookie;
- централизованной обработки ошибок;
- dev/prod конфигурации.

# 14. Middleware frontend
Файл:
text frontend/src/middleware.ts
Задачи middleware:
- проверять авторизацию;
- ограничивать доступ к (private);
- защищать API routes;
- ограничивать доступ к приватным фото/файлам;
- перенаправлять неавторизованных пользователей на login;
- перенаправлять авторизованных пользователей с login на profile/edit или home.
Пример логики:
text /private/_ → нужен accessToken /api/private/_ → нужен accessToken /auth/login → если пользователь уже авторизован, redirect на главную

# 15. Redux и Redux Thunk
Redux используется для глобального состояния.
Хранить можно:
text auth user profile location ui
Пример slices:
text authSlice userSlice profileSlice countrySlice regionSlice citySlice uiSlice
Redux Thunk используется для async-запросов:
text signInThunk signUpThunk loadMeThunk updateProfileThunk loadCountriesThunk loadCountryByIdThunk

# 16. Компоненты
Названия компонентов должны состоять минимум из двух слов.
Примеры:
text HeaderMain FooterMain ButtonMain InputMain FormLogin FormRegister ProfileEditForm CountryList RegionList CityList LoaderMain ModalMain
Не использовать названия:
text Button Input Header Footer Form Modal

# 17. PWA
Нужно добавить PWA-конфигурацию:
- manifest;
- service worker;
- иконки;
- offline fallback;
- meta theme color.
Пример файлов:
text frontend/public/manifest.json frontend/public/icons/icon-192.png frontend/public/icons/icon-512.png

# 18. Makefile
В корне проекта нужен Makefile.
Пример команд:
makefile install: cd backend && npm install cd frontend && npm install dev: make backend-dev & make frontend-dev backend-dev: cd backend && npm run dev frontend-dev: cd frontend && npm run dev backend-build: cd backend && npm run build frontend-build: cd frontend && npm run build backend-start: cd backend && pm2 start ecosystem.config.js docker-up: docker compose up -d docker-down: docker compose down db-postgres-up: docker compose --profile postgres up -d db-mongo-up: docker compose --profile mongo up -d db-sqlite-up: echo "SQLite does not require docker container" migrate-postgres: cd backend && npm run db:migrate:postgres seed-postgres: cd backend && npm run db:seed:postgres

# 19. Docker Compose
В корне проекта нужен:
text docker-compose.yml
Сервисы:
text backend frontend postgres mongo
SQLite отдельный контейнер не требует.
Пример логики:
yaml services: backend: build: ./backend ports: - "3010:3010" env_file: - ./backend/.env depends_on: - postgres - mongo frontend: build: ./frontend ports: - "5178:5178" env_file: - ./frontend/.env depends_on: - backend postgres: image: postgres:16 profiles: - postgres environment: POSTGRES_USER: app POSTGRES_PASSWORD: app POSTGRES_DB: app_db ports: - "5432:5432" mongo: image: mongo:7 profiles: - mongo ports: - "27017:27017"

# 20. Этапы разработки
## Этап 1. Подготовка проекта
Задачи:
- создать monorepo-структуру;
- добавить backend;
- добавить frontend;
- добавить корневой Makefile;
- добавить docker-compose.yml;
- настроить .env.example;
- настроить TypeScript;
- настроить ESLint/Prettier;
- настроить базовые npm scripts.
Результат:
text Проект запускается локально. Backend и frontend имеют отдельные команды запуска.

## Этап 2. Backend base
Задачи:
- настроить Express;
- подключить GraphQL;
- настроить config/env;
- настроить обработчик ошибок;
- настроить CORS;
- настроить PM2;
- создать healthcheck endpoint;
- подготовить Clean Architecture структуру.
Результат:
text Backend запускается на порту 3010. GraphQL endpoint доступен.

## Этап 3. Database layer
Задачи:
- реализовать переключение БД через .env;
- подключить MongoDB;
- подключить PostgreSQL через Sequelize;
- подключить SQLite;
- создать общие интерфейсы репозиториев;
- создать реализации репозиториев для каждой БД;
- добавить миграции для PostgreSQL/SQLite;
- добавить seed-данные для стран, регионов и городов.
Результат:
text Backend может работать с MongoDB, PostgreSQL или SQLite без изменения бизнес-логики.

## Этап 4. User/Profile module
Задачи:
- создать User entity;
- создать Profile entity;
- создать DTO;
- создать validators;
- создать repositories;
- создать use cases:
  - create user;
  - get user by id;
  - get user by email;
  - update user;
  - get profile;
  - update profile.
Результат:
text Пользователь и профиль создаются, читаются и обновляются.

## Этап 5. Auth module
Задачи:
- регистрация;
- вход;
- bcrypt hash;
- JWT accessToken;
- JWT refreshToken;
- refresh token flow;
- logout;
- защита GraphQL resolver;
- получение текущего пользователя через me.
Результат:
text Работает базовая авторизация через email/password.

## Этап 6. Mail module
Задачи:
- подключить nodemailer;
- настроить SMTP;
- создать шаблоны писем;
- отправлять письмо подтверждения email;
- отправлять письмо восстановления пароля;
- добавить токены подтверждения и восстановления.
Результат:
text Пользователь может подтвердить email и восстановить пароль.

## Этап 7. GitHub OAuth
Задачи:
- создать GitHub OAuth app;
- добавить env-переменные;
- реализовать redirect на GitHub;
- реализовать callback;
- получить данные пользователя;
- связать GitHub-аккаунт с User;
- выдать JWT.
Результат:
text Пользователь может войти через GitHub.

## Этап 8. Telegram auth
Задачи:
- создать Telegram bot;
- получить telegramId пользователя;
- реализовать привязку Telegram к профилю;
- реализовать вход через Telegram;
- проверить подпись Telegram-данных;
- добавить защиту от подмены telegramId.
Результат:
text Пользователь может привязать Telegram и использовать его для авторизации.

## Этап 9. Two-factor auth
Задачи:
- добавить speakeasy;
- добавить qrcode;
- реализовать создание 2FA secret;
- реализовать QR-код;
- реализовать подтверждение 2FA;
- реализовать вход с 2FA;
- реализовать отключение 2FA.
Результат:
text Пользователь может включить дополнительную защиту аккаунта.

## Этап 10. Location module
Задачи:
- создать Country;
- создать Region;
- создать City;
- реализовать GraphQL queries:
  - все страны;
  - страна по id;
  - регионы страны;
  - регион по id;
  - города региона;
  - город по id.
Результат:
text Публичные страницы стран, регионов и городов получают данные из backend.

## Этап 11. Frontend base
Задачи:
- создать Next.js frontend;
- настроить TypeScript;
- настроить Sass;
- настроить Redux;
- настроить Redux Thunk;
- настроить StoreProvider;
- настроить Axios;
- настроить GraphQL client;
- настроить next.config.mjs;
- создать глобальный layout;
- создать HeaderMain и FooterMain.
Результат:
text Frontend запускается на порту 5178. Есть базовая структура FSD.

## Этап 12. Frontend auth
Задачи:
- создать страницу login;
- создать страницу sign-up;
- создать форму входа;
- создать форму регистрации;
- создать GitHubLoginButton;
- создать TelegramLoginButton;
- добавить обработку 2FA;
- добавить восстановление пароля;
- добавить хранение токенов;
- добавить refresh token flow;
- добавить logout.
Результат:
text Пользователь может зарегистрироваться, войти и выйти через frontend.

## Этап 13. Frontend profile
Задачи:
- создать страницу редактирования профиля;
- загрузить текущего пользователя;
- загрузить профиль;
- создать EditProfileForm;
- добавить поля профиля;
- реализовать сохранение данных;
- добавить загрузку avatarUrl и coverSrc, если будет файловое хранилище.
Результат:
text Пользователь может редактировать свой профиль.

## Этап 14. Frontend public pages
Задачи:
- создать главную страницу;
- создать about;
- создать список стран;
- создать страницу страны;
- создать страницу региона;
- создать страницу города;
- подключить данные через GraphQL/API proxy.
Результат:
text Публичная часть сайта доступна без авторизации.

## Этап 15. Middleware and protection
Задачи:
- настроить frontend/src/middleware.ts;
- защитить приватные страницы;
- защитить приватные API routes;
- добавить redirect для гостей;
- добавить redirect для авторизованных пользователей;
- ограничить доступ к приватным фото и данным.
Результат:
text Приватные разделы недоступны без авторизации.

## Этап 16. PWA
Задачи:
- добавить manifest;
- добавить icons;
- добавить service worker;
- настроить offline fallback;
- добавить PWA meta.
Результат:
text Приложение можно установить как PWA.

## Этап 17. Docker and PM2
Задачи:
- добавить Dockerfile для backend;
- добавить Dockerfile для frontend;
- настроить docker-compose;
- настроить profiles для MongoDB/PostgreSQL;
- настроить PM2 ecosystem;
- добавить production-команды в Makefile.
Результат:
text Приложение можно запускать локально и в Docker. Backend можно запускать через PM2.

## Этап 18. Тестирование
Задачи:
- протестировать регистрацию;
- протестировать подтверждение email;
- протестировать восстановление пароля;
- протестировать вход;
- протестировать refreshToken;
- протестировать GitHub auth;
- протестировать Telegram auth;
- протестировать 2FA;
- протестировать редактирование профиля;
- протестировать публичные страницы;
- протестировать переключение БД.
Результат:
text Основные пользовательские сценарии работают стабильно.

# 21. Приоритет разработки
## MVP
В первую очередь сделать:
1. Backend base.
2. Database layer.
3. User/Profile.
4. Email/password auth.
5. JWT access/refresh.
6. Email confirmation.
7. Password reset.
8. Frontend login/sign-up.
9. Frontend profile edit.
10. Public pages country/region/city.
## После MVP
Добавить:
1. GitHub OAuth.
2. Telegram auth.
3. 2FA.
4. PWA.
5. Docker profiles.
6. PM2 production setup.
7. Расширенные проверки безопасности.

# 22. Основные риски
## 1. Три базы данных усложняют архитектуру
MongoDB, PostgreSQL и SQLite имеют разные подходы к моделям, связям и миграциям.
Решение:
text Работать через repository interfaces. Не использовать ORM напрямую в use cases.

## 2. Telegram ID нельзя принимать без проверки
Нельзя просто получить telegramId с frontend и считать пользователя авторизованным.
Решение:
text Проверять подпись Telegram Login Widget или использовать backend flow через Telegram bot.

## 3. Refresh token нужно хранить безопасно
Нельзя просто бесконечно выдавать refreshToken без контроля.
Решение:
text Хранить refreshToken hash в базе. Делать rotation refreshToken. Удалять refreshToken при logout. Инвалидировать старые токены после смены пароля.

## 4. 2FA secret нужно хранить безопасно
Секрет 2FA нельзя отдавать повторно после активации.
Решение:
text Хранить secret в базе. Показывать QR только на этапе подключения. Подтверждать включение кодом.

## 5. Email может быть неподтверждённым
Даже если пользователь зарегистрировался через внешний ресурс, email должен оставаться обязательным, но его статус нужно хранить отдельно.
Решение:
text email хранится в User. isVerified хранится в Profile.

# 23. Итоговая структура проекта
text project-root/ backend/ src/ package.json tsconfig.json Dockerfile ecosystem.config.js .env.example frontend/ src/ public/ package.json tsconfig.json next.config.mjs Dockerfile .env.example docker-compose.yml Makefile README.md

# 24. Финальный результат
После реализации должен получиться проект, где:
- backend работает на 3010;
- frontend работает на 5178;
- backend использует Express + TypeScript + GraphQL;
- авторизация работает через JWT access/refresh;
- есть регистрация, вход, восстановление пароля и подтверждение email;
- есть GitHub auth;
- есть Telegram auth;
- есть 2FA через speakeasy/qrcode;
- пользователь может редактировать профиль;
- публичные страницы стран, регионов и городов получают данные из backend;
- frontend построен по FSD;
- backend построен по Clean Architecture + Feature Modules;
- БД можно переключать через .env;
- проект запускается через Makefile;
- проект можно поднять через Docker Compose.
