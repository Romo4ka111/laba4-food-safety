# Автоматический деплой через GitHub Actions

В проекте настроен файл `.github/workflows/ci.yml`. Он выполняет три этапа:

1. **frontend** — установка зависимостей и сборка React-приложения;
2. **backend** — запуск PostgreSQL в GitHub Actions, проверка backend и smoke-test;
3. **deploy** — автоматическая загрузка проекта на сервер после успешного push в ветку `main` или `master`.

## Что это закрывает в задании

Этот механизм относится к пункту CI/CD: после изменения кода в GitHub автоматически запускаются проверки, собирается frontend и обновляется сервер.

## GitHub Secrets

В репозитории нужно открыть:

```text
Settings → Secrets and variables → Actions → New repository secret
```

Добавить секреты:

| Secret | Пример значения | Назначение |
|---|---|---|
| `SSH_HOST` | `217.71.129.139` | IP сервера |
| `SSH_USER` | `romanalx` | пользователь SSH |
| `SSH_PORT` | `5114` | SSH-порт |
| `SSH_KEY` | содержимое приватного SSH-ключа | доступ GitHub Actions к серверу |
| `DEPLOY_PATH` | `/home/romanalx/laba4` | папка приложения на сервере |
| `WEB_ROOT` | `/var/www/html` | папка, которую отдаёт Apache |
| `DATABASE_URL` | `postgresql://postgres:CHANGE_ME@127.0.0.1:5432/laba4_food_safety_db` | строка подключения к PostgreSQL |
| `JWT_SECRET` | длинная секретная строка | секрет JWT |
| `CORS_ORIGIN` | `https://217.71.129.139:5106` | адрес сайта |
| `PGSSL` | `false` | SSL для PostgreSQL |

## Подготовка сервера один раз

На сервере должны быть установлены Node.js, npm, PostgreSQL, Apache и модули proxy/rewrite.

Создать базу:

```bash
createdb -U postgres laba4_food_safety_db
```

Создать папку приложения:

```bash
mkdir -p /home/romanalx/laba4
```

Чтобы GitHub Actions мог обновлять статические файлы Apache без ввода пароля, можно один раз выдать пользователю права на `/var/www/html`:

```bash
sudo chown -R romanalx:www-data /var/www/html
sudo chmod -R 775 /var/www/html
```

Настроить Apache proxy `/api` на backend:

```apache
ProxyPass /api http://127.0.0.1:5001/api
ProxyPassReverse /api http://127.0.0.1:5001/api

<Directory /var/www/html>
    Options -Indexes
    AllowOverride All
    Require all granted
    RewriteEngine On
    RewriteBase /
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</Directory>
```

Проверить конфиг и перезапустить Apache:

```bash
sudo apache2ctl configtest
sudo systemctl restart apache2
```

## Как работает деплой

После `git push` в `main` или `master` GitHub Actions:

1. проверяет frontend;
2. проверяет backend с PostgreSQL;
3. собирает папку `build`;
4. загружает исходники и сборку на сервер по SSH;
5. обновляет `backend/.env` из GitHub Secrets;
6. устанавливает backend-зависимости;
7. перезапускает backend;
8. копирует `build` в `/var/www/html`;
9. проверяет `/api/health`.

## Проверка после деплоя

Открыть:

```text
https://217.71.129.139:5106/
```

Проверить API:

```text
https://217.71.129.139:5106/api/health
```
