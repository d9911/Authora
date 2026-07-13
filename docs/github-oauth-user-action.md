# GitHub OAuth: public deployment checklist

Дата проверки: 2026-07-13

## Подтверждённый runtime

После пересборки Authora использует один публичный OAuth contract:

```text
Frontend: http://d9911.zapto.org:5178
Backend:  http://d9911.zapto.org:3010
Callback: http://d9911.zapto.org:3010/api/auth/github/callback
```

Проверено без завершения логина:

- `GET /api/auth/github` возвращает `302` на GitHub;
- параметр `redirect_uri` равен публичному callback выше;
- backend error redirect возвращается на публичный frontend;
- production frontend bundle получает публичный `NEXT_PUBLIC_BACKEND_URL`;
- GitHub принимает callback и переводит на обычную страницу sign-in; предупреждения
  `Be careful!` и `redirect_uri is not associated` отсутствуют.

До исправления Compose и frontend build фиксировали `localhost`, поэтому GitHub
получал `redirect_uri=http://localhost:3010/api/auth/github/callback` даже при
открытии публичного сайта.

## Обязательная настройка GitHub OAuth App

В GitHub Developer settings для OAuth App, чей `GITHUB_CLIENT_ID` используется
backend, должны быть сохранены:

```text
Homepage URL:
http://d9911.zapto.org:5178

Authorization callback URL:
http://d9911.zapto.org:3010/api/auth/github/callback
```

Runtime authorize probe подтверждает, что текущий OAuth App принимает этот
callback. Сохранённые поля GitHub Developer settings напрямую не читались.

Значение `GITHUB_CALLBACK_URL` и callback в GitHub должны относиться к одному
OAuth App. Не передавайте `GITHUB_CLIENT_SECRET` в чат, логи или frontend env.

GitHub сопоставляет host и port переданного `redirect_uri` с зарегистрированным
callback, а path должен совпадать или быть его подкаталогом:
https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#redirect-urls

Обычный GitHub OAuth App имеет один callback URL. Для независимых local и public
режимов используйте два OAuth Apps и разные пары client ID/secret:
https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app

## Активная Docker-конфигурация

Локальный root `.env` для публичного тестового окружения содержит только эти
несекретные URL-настройки дополнительно к существующим secrets:

```env
FRONTEND_URL=http://d9911.zapto.org:5178
CORS_ORIGINS=http://localhost:5178,http://d9911.zapto.org:5178
GITHUB_CALLBACK_URL=http://d9911.zapto.org:3010/api/auth/github/callback
NEXT_PUBLIC_BACKEND_URL=http://d9911.zapto.org:3010
COOKIE_SECURE=false
ALLOW_INSECURE_PUBLIC_HTTP=true
```

`docker-compose.yml` читает эти значения с безопасными localhost defaults.
`NEXT_PUBLIC_BACKEND_URL` передаётся как build argument, поэтому после его
изменения frontend необходимо пересобрать, а не только перезапустить.

## Временное ограничение HTTP

Текущий `:5178` не поддерживает TLS, а порт `:443` не проксирует Authora. Поэтому
публичный OAuth сейчас работает через незашифрованный HTTP только как явно
разрешённый staging-режим:

```env
ALLOW_INSECURE_PUBLIC_HTTP=true
COOKIE_SECURE=false
```

Default остаётся безопасным: `ALLOW_INSECURE_PUBLIC_HTTP=false`, и production
backend отклоняет внешний `http://FRONTEND_URL`. Для нормального deployment
нужны доверенный TLS-сертификат, reverse proxy на Authora, HTTPS URL во всех
трёх публичных переменных и `COOKIE_SECURE=true`.

## Пересборка и проверка

```bash
docker compose --profile mongo \
  -f docker-compose.yml -f docker-compose.mongo.yml \
  build backend frontend

docker compose --profile mongo \
  -f docker-compose.yml -f docker-compose.mongo.yml \
  up -d --no-build --force-recreate backend frontend
```

После этого:

1. открыть `http://d9911.zapto.org:5178/en/profile/edit`;
2. перейти на sign-in и нажать GitHub;
3. убедиться, что GitHub больше не показывает `redirect_uri is not associated`;
4. завершить вход;
5. проверить возврат на исходный локализованный `next` route.

## Ротация secret

Во время диагностики текущий GitHub client secret попал в служебный tool output.
Его следует считать раскрытым: сгенерировать новый secret в GitHub, заменить
`GITHUB_CLIENT_SECRET` в локальных env и пересоздать backend-контейнер. Старый
secret после проверки нового необходимо удалить.

## Rollback на localhost

```env
FRONTEND_URL=http://localhost:5178
CORS_ORIGINS=http://localhost:5178
GITHUB_CALLBACK_URL=http://localhost:3010/api/auth/github/callback
NEXT_PUBLIC_BACKEND_URL=http://localhost:3010
ALLOW_INSECURE_PUBLIC_HTTP=false
```

После rollback также восстановите localhost callback в отдельном local OAuth App
и пересоберите оба контейнера.
