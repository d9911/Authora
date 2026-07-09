# GitHub OAuth: что нужно от владельца проекта

Дата: 2026-07-09

## Текущий факт

GitHub OAuth сейчас открывается с таким callback:

```text
redirect_uri=http://localhost:3010/api/auth/github/callback
```

Этот URL берется из backend env `GITHUB_CALLBACK_URL`. В текущем Docker-config
этот же callback задан в `docker-compose.yml`.

Ошибка GitHub:

```text
The redirect_uri is not associated with this application.
```

означает, что OAuth App на стороне GitHub для текущего `client_id` не принимает
callback `http://localhost:3010/api/auth/github/callback`.

Источник по правилу GitHub: в GitHub Docs для OAuth Apps указано, что если
`redirect_uri` передан, его host и port должны совпадать с callback URL,
настроенным в OAuth App, а path должен быть допустимым относительно callback.
Документация: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#redirect-urls

## Что от тебя нужно

Нужно выбрать один режим, в котором мы сейчас запускаем OAuth.

## Вариант A: локальная разработка

Используем:

```text
Frontend: http://localhost:5178
Backend:  http://localhost:3010
Callback: http://localhost:3010/api/auth/github/callback
```

Что нужно сделать в GitHub:

1. Открыть GitHub Developer settings.
2. Найти OAuth App с client id:

```text
Ov23liqRVxF4DIeLkDIU
```

3. В настройках OAuth App поставить:

```text
Homepage URL:
http://localhost:5178

Authorization callback URL:
http://localhost:3010/api/auth/github/callback
```

4. Сохранить настройки.
5. Перезапустить проект:

```bash
make doc-mongo
```

После этого GitHub должен вернуть пользователя на backend callback, backend
обменяет `code` на GitHub token, затем приложение вернет пользователя во
frontend через `/oauth/complete`.

## Вариант B: внешний адрес вместо localhost

Используем публичные адреса, например:

```text
Frontend: http://d9911.zapto.org:5178
Backend:  http://d9911.zapto.org:3010
Callback: http://d9911.zapto.org:3010/api/auth/github/callback
```

Что нужно сделать в GitHub:

```text
Homepage URL:
http://d9911.zapto.org:5178

Authorization callback URL:
http://d9911.zapto.org:3010/api/auth/github/callback
```

Что нужно синхронно держать в env:

```env
FRONTEND_URL=http://d9911.zapto.org:5178
CORS_ORIGINS=http://d9911.zapto.org:5178
GITHUB_CALLBACK_URL=http://d9911.zapto.org:3010/api/auth/github/callback
NEXT_PUBLIC_BACKEND_URL=http://d9911.zapto.org:3010
```

После изменения env нужен rebuild/restart:

```bash
make doc-mongo
```

## Что лучше для проекта

Лучший рабочий вариант: завести два отдельных GitHub OAuth Apps:

```text
Authora Local
Homepage URL: http://localhost:5178
Callback URL: http://localhost:3010/api/auth/github/callback

Authora Public
Homepage URL: http://d9911.zapto.org:5178
Callback URL: http://d9911.zapto.org:3010/api/auth/github/callback
```

Так не придется каждый раз менять callback в одном GitHub OAuth App при
переключении между localhost и публичным адресом.

## Что прислать мне

Без секретов:

1. Какой режим выбираем сейчас: `localhost` или внешний домен.
2. Текущий `Homepage URL` из GitHub OAuth App.
3. Текущий `Authorization callback URL` из GitHub OAuth App.
4. Подтверждение, что client id в GitHub OAuth App такой:

```text
Ov23liqRVxF4DIeLkDIU
```

5. Если выбираем внешний домен: какой точный публичный backend base URL должен
   использоваться браузером.

Не присылай `GITHUB_CLIENT_SECRET` в чат.

## Что не является причиной этой ошибки

- Email `d.99113@gmail.com` не влияет на ошибку `redirect_uri`.
- Mail/SMTP уже отдельно работает и не участвует в GitHub callback matching.
- Telegram bot auth не участвует в GitHub OAuth redirect.

## Как проверить после настройки GitHub

1. Открыть приложение.
2. Нажать GitHub login/link.
3. На странице GitHub не должно быть ошибки `redirect_uri is not associated`.
4. После разрешения доступа GitHub должен вернуть на:

```text
http://localhost:3010/api/auth/github/callback
```

или на внешний callback, если выбран внешний режим.

5. После backend callback пользователь должен попасть обратно во frontend.
