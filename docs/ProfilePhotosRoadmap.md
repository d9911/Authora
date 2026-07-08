# Profile Photos Roadmap

Дата: 2026-07-08

## Цель

Добавить полноценную логику фотографий профиля: загрузка, server-side crop/resize, хранение в MongoDB, замена, удаление, один avatar и один cover на пользователя.

Код в рамках этого документа не реализуется. Это карта работ, по которой можно двигаться в разработке.

## Что уже есть в проекте

1. Пользователь уже имеет поле `avatarUrl`.
   Источники: `backend/src/modules/user/domain/User.ts:6-15`, `backend/src/app/graphql/schema.ts:4-17`, `frontend/src/shared/types/index.ts:3-16`.

2. Профиль уже имеет поле `coverSrc`.
   Источники: `backend/src/modules/profile/domain/Profile.ts:1-15`, `backend/src/app/graphql/schema.ts:19-33`, `frontend/src/shared/types/index.ts:18-32`.

3. Текущий `updateProfile` принимает `avatarUrl` и `coverSrc` как строки.
   Источники: `backend/src/modules/profile/use-cases/ProfileUseCases.ts:7-22`, `backend/src/modules/profile/use-cases/ProfileUseCases.ts:41-61`, `frontend/src/entities/profile/api/profileApi.ts:9-22`.

4. В форме профиля сейчас редактируются ручные URL-поля `Avatar URL` и `Cover image URL`.
   Источник: `frontend/src/features/EditProfileForm/EditProfileForm.tsx:90-121`.

5. В MongoDB сейчас это строковые поля: `avatarUrl` в `User`, `coverSrc` в `Profile`.
   Источники: `backend/src/infrastructure/database/mongo/models.ts:3-18`, `backend/src/infrastructure/database/mongo/models.ts:20-34`.

6. В текущем GraphQL schema нет upload/delete мутаций для фотографий.
   Источник: список текущих mutation находится в `backend/src/app/graphql/schema.ts:136-161`.

Вывод: сейчас проект поддерживает только сохранение URL, но не поддерживает загрузку файла, crop, хранение бинарных данных в MongoDB, замену старой фотографии и удаление фотографии.

## Архитектурное решение

Рекомендация: не хранить base64 внутри `User` или `Profile`. Хранить бинарные изображения в отдельной MongoDB collection, а в `avatarUrl` и `coverSrc` сохранять только app-owned URL, например `/api/profile-images/<userId>/avatar?v=<version>`.

Почему так:

- `User` и `Profile` остаются легкими документами.
- Можно гарантировать одно изображение каждого типа через unique index `(userId, kind)`.
- Замена изображения становится атомарным upsert.
- Удаление изображения очищает binary-документ и соответствующий URL.
- `<img>` в браузере получает обычный URL, а не GraphQL payload.

Предлагаемая модель:

- `ProfileImage`
- `userId`
- `kind`: `avatar` или `cover`
- `contentType`: итоговый MIME после обработки, например `image/webp`
- `data`: `Buffer`
- `sizeBytes`
- `width`
- `height`
- `etag`
- `createdAt`
- `updatedAt`

Ограничение: у пользователя может быть максимум один `avatar` и максимум один `cover`. Это фиксируется unique index по `{ userId, kind }`.

## Avatar crop

Avatar лучше хранить как квадратное изображение, а круглым делать на уровне UI через `border-radius: 50%`.

Правило обработки:

- вход: JPEG, PNG или WebP;
- сервер валидирует MIME и фактическую сигнатуру файла;
- сервер удаляет metadata;
- сервер делает center-crop до квадрата;
- сервер ресайзит до `512x512`;
- сервер сохраняет итоговый файл как WebP;
- UI показывает avatar круглым;
- при необходимости квадратный вариант можно использовать без повторной обработки, потому что сохраненная картинка уже квадратная.

Это совпадает с логикой GitHub-подобного avatar: исходная фотография приводится к квадрату, а круглая форма является отображением.

## Cover crop

Cover не должен быть круглым. Для cover нужен широкий формат.

Рекомендованное правило:

- вход: JPEG, PNG или WebP;
- server-side center-crop до `3:1`;
- итоговый размер: `1920x640`;
- итоговый формат: WebP;
- UI использует `object-fit: cover`;
- при удалении cover показывается дефолтный фон профиля.

## GraphQL и HTTP разделение

В проекте основной API слой — GraphQL. Поэтому операции состояния делаем через GraphQL:

- `uploadProfileImage(kind, dataBase64, mimeType, crop?)`
- `deleteProfileImage(kind)`
- `me`
- `myProfile`
- `updateProfile`

Но саму выдачу картинки лучше делать через HTTP route, потому что `<img src="...">` должен получать бинарный ответ:

- `GET /api/profile-images/:userId/avatar`
- `GET /api/profile-images/:userId/cover`

GraphQL возвращает URL и metadata. HTTP route возвращает изображение с `Content-Type`, `ETag`, `Cache-Control`.

Если принципиально держать upload тоже не в base64, тогда нужен multipart upload endpoint. Но это потребует отдельной proxy-логики, потому что текущий frontend GraphQL proxy работает с JSON body.
Источник текущего JSON proxy: `frontend/src/shared/api/requestHandler.ts:82-149`.

## Security rules

1. Upload/delete доступны только авторизованному пользователю.
   Источник текущего auth guard pattern: `backend/src/app/graphql/resolvers.ts:6-14`.

2. Пользователь может менять только свои `avatar` и `cover`.

3. Сервер не доверяет client-side crop.

4. Разрешенные входные форматы: JPEG, PNG, WebP.

5. Запрещенные входные форматы на первом этапе: SVG, GIF, HEIC, PDF, любые архивы.

6. Лимиты:
   - avatar input: максимум 5 MB;
   - cover input: максимум 10 MB;
   - decoded pixel count: отдельный лимит, чтобы защититься от image bombs.

7. Сервер всегда пересобирает изображение и удаляет metadata.

8. `avatarUrl` и `coverSrc` нельзя больше принимать как произвольные внешние URL в обычной форме профиля. Они должны обновляться только через upload/delete photo mutations.

## Roadmap сверху вниз

### Этап 1. Зафиксировать контракт

Файлы:

- создать `docs/ProfilePhotosRoadmap.md`;
- позже создать `docs/ProfilePhotosApi.md`, если понадобится отдельная API-документация.

Задачи:

1. Согласовать, что avatar хранится как квадрат `512x512`, а круглая форма делается CSS.
2. Согласовать, что cover хранится как `1920x640`.
3. Согласовать, что upload идет через GraphQL JSON base64 на первом этапе.
4. Согласовать, что binary read идет через HTTP image route.
5. Согласовать, нужно ли публичное чтение avatar/cover или только для авторизованных пользователей.

### Этап 2. Backend data model для MongoDB

Файлы:

- изменить `backend/src/infrastructure/database/mongo/models.ts`;
- создать `backend/src/modules/profile-photo/domain/ProfileImage.ts`;
- создать `backend/src/modules/profile-photo/domain/ProfileImageRepository.ts`;
- создать `backend/src/infrastructure/database/mongo/MongoProfileImageRepository.ts`;
- изменить `backend/src/infrastructure/database/repositories/index.ts`;

Задачи:

1. Добавить `profileImageSchema`.
2. Добавить unique index `{ userId: 1, kind: 1 }`.
3. Добавить repository методы:
   - `findByUserAndKind(userId, kind)`;
   - `upsert(userId, kind, image)`;
   - `delete(userId, kind)`.
4. Не менять пока публичный GraphQL schema.
5. Написать backend tests на upsert/delete, чтобы доказать правило "один avatar и один cover".

### Этап 3. Backend image processing service

Файлы:

- создать `backend/src/modules/profile-photo/services/ProfileImageProcessor.ts`;
- создать `backend/src/modules/profile-photo/use-cases/ProfilePhotoUseCases.ts`;
- изменить `backend/package.json`, если подтверждаем dependency на `sharp`.

Задачи:

1. Добавить обработку avatar:
   - decode input;
   - validate MIME;
   - center-crop square;
   - resize to `512x512`;
   - output WebP.
2. Добавить обработку cover:
   - decode input;
   - validate MIME;
   - center-crop `3:1`;
   - resize to `1920x640`;
   - output WebP.
3. Считать `etag` от итогового binary.
4. Вернуть metadata: `url`, `width`, `height`, `sizeBytes`, `contentType`, `updatedAt`.
5. Добавить tests на:
   - JPEG accepted;
   - PNG accepted;
   - WebP accepted;
   - SVG rejected;
   - too-large file rejected;
   - avatar output square;
   - cover output `3:1`.

### Этап 4. GraphQL mutations

Файлы:

- изменить `backend/src/app/graphql/schema.ts`;
- изменить `backend/src/app/graphql/resolvers.ts`;
- изменить `backend/src/app/container.ts`;

Задачи:

1. Добавить enum:
   - `ProfileImageKind`: `AVATAR`, `COVER`.
2. Добавить input:
   - `ProfileImageUploadInput`.
3. Добавить type:
   - `ProfileImage`.
4. Добавить payload:
   - `ProfileImagePayload`, который возвращает `user`, `profile`, `image`.
5. Добавить mutation:
   - `uploadProfileImage(input: ProfileImageUploadInput!): ProfileImagePayload!`;
   - `deleteProfileImage(kind: ProfileImageKind!): ProfileImagePayload!`.
6. В resolver использовать `requireAuth(ctx)`.
7. После avatar upload обновлять `User.avatarUrl`.
8. После cover upload обновлять `Profile.coverSrc`.
9. После delete очищать соответствующее поле.

Важно: текущий `updateProfile` возвращает только `Profile`.
Источник: `backend/src/app/graphql/schema.ts:150`, `backend/src/app/graphql/resolvers.ts:122-125`.
Для фото лучше вернуть и `user`, и `profile`, чтобы frontend сразу обновлял avatar и cover без рассинхронизации.

### Этап 5. HTTP image serving route

Файлы:

- создать backend route, например `backend/src/app/profileImageRoutes.ts`;
- подключить его в `backend/src/app/express.ts`;
- при необходимости создать frontend proxy route в `frontend/src/app/api/profile-images/[userId]/[kind]/route.ts`.

Задачи:

1. Реализовать `GET /api/profile-images/:userId/:kind`.
2. Читать image из MongoDB по `userId + kind`.
3. Возвращать `404`, если изображения нет.
4. Возвращать:
   - `Content-Type`;
   - `Content-Length`;
   - `ETag`;
   - `Cache-Control`.
5. Поддержать `If-None-Match` и `304`.
6. Решить уровень приватности:
   - public read для avatar/cover;
   - или auth-only read, если фотографии считаются приватными.

### Этап 6. Frontend API слой

Файлы:

- создать `frontend/src/entities/profile-photo/api/profilePhotoApi.ts`;
- изменить `frontend/src/shared/types/index.ts`;
- возможно изменить `frontend/src/processes/store/slices/profileSlice.ts`;
- возможно изменить `frontend/src/processes/store/slices/authSlice.ts`.

Задачи:

1. Добавить frontend types:
   - `ProfileImageKind`;
   - `ProfileImage`;
   - `ProfileImagePayload`.
2. Добавить GraphQL functions:
   - `uploadProfileImage`;
   - `deleteProfileImage`.
3. После avatar upload обновлять auth user state.
4. После cover upload обновлять profile state.
5. После delete обновлять соответствующее state поле на `undefined` или `null`.

### Этап 7. Frontend crop/upload UI

Файлы:

- создать `frontend/src/features/ProfilePhotoManager/ui/ProfilePhotoManager.tsx`;
- создать `frontend/src/features/ProfilePhotoManager/ui/AvatarUploader.tsx`;
- создать `frontend/src/features/ProfilePhotoManager/ui/CoverUploader.tsx`;
- создать `frontend/src/features/ProfilePhotoManager/model/imageCrop.ts`;
- создать SCSS module рядом с feature;
- изменить `frontend/src/features/EditProfileForm/EditProfileForm.tsx`.

Задачи:

1. Убрать ручной ввод `Avatar URL` и `Cover image URL` из основной формы.
2. Добавить отдельный блок фотографий перед обычными profile fields.
3. Для avatar:
   - выбрать файл;
   - показать preview;
   - показать round preview;
   - сделать center crop по умолчанию;
   - отправить upload mutation.
4. Для cover:
   - выбрать файл;
   - показать wide preview;
   - сделать center crop по умолчанию;
   - отправить upload mutation.
5. Добавить replace flow:
   - новый upload заменяет старое изображение того же `kind`.
6. Добавить delete flow:
   - кнопка удаления;
   - подтверждение;
   - mutation `deleteProfileImage`.
7. Не добавлять frontend crop dependency на первом этапе: preview можно сделать через Canvas API.

### Этап 8. UI consumption

Файлы:

- изменить `frontend/src/widgets/HeaderMain/HeaderMain.tsx`;
- изменить `frontend/src/widgets/ProfileCard/ProfileCard.tsx`;
- изменить `frontend/src/features/EditProfileForm/EditProfileForm.tsx`;
- проверить публичные profile/card места, если будут добавлены позже.

Задачи:

1. Header avatar должен брать `user.avatarUrl`.
2. Profile edit preview должен брать `user.avatarUrl` и `profile.coverSrc`.
3. Cover должен использовать `profile.coverSrc`.
4. Если avatar отсутствует, показывать initials/fallback.
5. Если cover отсутствует, показывать дефолтный фон.
6. Добавить cache busting через `?v=<updatedAt или etag>`.

### Этап 9. OAuth avatar migration

Файлы:

- проверить `backend/src/modules/auth/use-cases/AuthUseCases.ts`;
- проверить `backend/src/modules/auth/oauth/GithubOAuthService.ts`;
- проверить Telegram auth files.

Задачи:

1. Сейчас GitHub/Telegram могут приносить внешний `avatarUrl`.
   Источники: `backend/src/modules/auth/use-cases/AuthUseCases.ts:323-352`, `backend/src/modules/auth/use-cases/AuthUseCases.ts:359-376`.
2. На первом этапе оставить внешние OAuth URL как fallback.
3. После появления upload flow: пользовательский upload должен иметь приоритет над OAuth avatar.
4. Если пользователь удаляет свой uploaded avatar, можно вернуться к OAuth fallback или к initials. Это нужно выбрать заранее.

### Этап 10. Testing и QA

Backend команды:

- `npm run typecheck` в `backend`;
- `npm run build` в `backend`;
- `node tests/security/audit.mjs`;
- новые tests для profile images.

Frontend команды:

- `npm run typecheck` в `frontend`;
- `npm run build` в `frontend`;
- ручная проверка `/profile/edit`.

Manual QA:

1. Неавторизованный пользователь не может upload/delete.
2. Авторизованный пользователь загружает avatar.
3. Avatar отображается круглым.
4. Замена avatar удаляет/перезаписывает старый binary.
5. У пользователя остается только один avatar.
6. Удаление avatar очищает `user.avatarUrl`.
7. Авторизованный пользователь загружает cover.
8. Cover отображается широким фоном.
9. Замена cover удаляет/перезаписывает старый binary.
10. У пользователя остается только один cover.
11. Удаление cover очищает `profile.coverSrc`.
12. SVG отклоняется.
13. Файл больше лимита отклоняется.
14. После refresh страницы avatar и cover сохраняются.
15. После logout приватные upload/delete действия недоступны.

## Что нужно решить перед реализацией

1. Upload через GraphQL base64 или отдельный multipart endpoint.
   Рекомендация: GraphQL base64 для первого этапа, если размеры строго ограничены.

2. Нужны ли ручные URL-поля как fallback.
   Рекомендация: убрать из обычного edit flow, иначе пользователь сможет обойти upload-processing pipeline.

3. Публичны ли avatar/cover.
   Рекомендация: avatar и cover считать публичными profile assets, upload/delete оставить owner-only.

4. Что делать с OAuth avatar после пользовательского upload.
   Рекомендация: uploaded avatar имеет приоритет; OAuth avatar остается fallback.

5. Можно ли добавить `sharp` в backend.
   Рекомендация: да, потому что server-side crop/resize/metadata stripping без image processing library будет ненадежным.

## Итоговая последовательность

1. Согласовать размеры, privacy и upload transport.
2. Добавить MongoDB `ProfileImage` model + repository.
3. Добавить image processor.
4. Добавить GraphQL upload/delete mutations.
5. Добавить HTTP image serving route.
6. Добавить frontend API/types/store updates.
7. Добавить avatar/cover upload UI.
8. Подключить preview в profile edit/header/cards.
9. Закрыть OAuth fallback rules.
10. Прогнать backend/frontend/security/manual QA.
