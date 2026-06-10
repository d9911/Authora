приложение авторизация и немного информации

## backend port 3010
express pm2 typescript GraphQL!!! bcrypt jwt (для авторизации с accessToken и refreshToken) qrcode (speakeasy 2fa для доп защиты)
swagger
возможность при регистрации и востановлении работать через отправлять данные на mail
```
OWNER_EMAIL=test@d9911.org
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_USER=d.9911@mail.ru
SMTP_PASS=
```
и регистация через github возможность

у польщователя есть его основные данные
```
  public id!: number;
  public name?: string;
  public email!: string;  // может быть не подтвержденна даже при регистрации через люьой ресурс обязательна
  public password?: string; // может отсутствовать так как он может войти через телегу или через другой ресурс
  public nickname?: string;
  public phoneNumber?: string;
  public telegramId?: string; // можно взять с @userinfobot и через ip telegram(тоесть нужен бот для авторизации)
  public avatarUrl?: string; // фото профиля пусть хранится в базе
  public createdAt!: Date;
  public updatedAt!: Date;
```
и данные в профиле
```
  public id!: number;
  public userId!: number;
  public bio?: string;
  public isVerified!: boolean; // Добавлено: статус подтверждения через почту
  public description?: string;
  public coverSrc?: string; // фон
  public cityId?: number;
  public dateOfBirth?: Date;
  public gender?: string;
  public address?: string;
  public timezone?: string;
  public  createdAt!: Date;
  public  updatedAt!: Date;
  ```

для города пример
```
export interface CityAttributes {
  id: number;
  name: string;
  countryId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
```


доступны 3 db [их можно переключать в .env и отличаются команды в Makefile корневом!! ]: mongoDC postgreSql( испольщуя sequeliz) sqLite

испозуем архитектуру Clean Architecture + Feature modules (или DDD-lite)

## frontend 5178
next redux redux-thunk typescript sass (для кастомных стилей) axios pwa

используем запуск через next.config.mjs
используем и пишим прокси frontend/src/app/api для закрытия запросов при разработки без него

### структура страниц
frontend/src/app/(auth)/login/page.tsx signIn
frontend/src/app/(auth)/layout.tsx signUp
frontend/src/app/(private)/profile/edit/page.tsx редактирование профиля
frontend/src/app/(public)/about/page.tsx информация о сайте
frontend/src/app/(public)/country/[id]/page.tsx определённая страна со всеми регионами
frontend/src/app/(public)/country/page.tsx  все странны
frontend/src/app/(public)/region/[id]/page.tsx  все города в  ригионе
frontend/src/app/(public)/city/[id]/page.tsx определённый город
frontend/src/app/page.tsx // главная страница
frontend/src/app/loading.tsx // загрузка
frontend/src/app/layout.tsx // обёртка подключаем meta data StoreProvider  HeaderMain FooterMain
frontend/src/middleware.ts (все запросы через него проходят и он ограничивает доступ к api фото и тд)
названия части компонентов страниц (кнопки формы и тд) из 2 слов (HeaderMain FooterMain)

### испозуем архитектуру FSD(Feature sliced design) для всех данных !!!!!!!
```
app, processes(redux),pages,
widgets(максимально самостоятельно элементы),
features(бизнес ценность(форма отправки данных, регистрация))
entites(к примеру user(пользователь))
Slices Слайс[модули] - состовные части
shared переиспользуемые компоненты, утилиты, хуки и другие элементы
```

## в корне
Makefile для запуска всех процессов в приложенни
docker-compose.yml для докера