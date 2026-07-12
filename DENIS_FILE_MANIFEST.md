> Денис: файл создан или изменён по запросу пользователя.

# Denis file manifest

JSON does not support comments. Files in this table are the manually changed files that cannot contain the requested inline marker.

| Файл                                   | Действие | Маркер внутри | Причина                                                                         |
| -------------------------------------- | -------- | ------------- | ------------------------------------------------------------------------------- |
| `frontend/src/locales/ru/ui.json`      | updated  | no            | JSON comments are invalid; localized UI-kit catalog and component state strings |
| `frontend/src/locales/en/ui.json`      | updated  | no            | JSON comments are invalid; English key parity for the UI-kit catalog            |
| `frontend/src/locales/ru/profile.json` | updated  | no            | JSON comments are invalid; themed profile-image deletion dialog labels          |
| `frontend/src/locales/en/profile.json` | updated  | no            | JSON comments are invalid; English parity for profile deletion dialog labels    |
