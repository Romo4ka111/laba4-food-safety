# Деплой

## Требования

- Node.js 20 или новее;
- PostgreSQL 14 или новее;
- доступ к базе через `DATABASE_URL`;
- для frontend: npm/pnpm и сборка React-приложения.

## Локальный запуск PostgreSQL

Создать базу можно через pgAdmin или через терминал:

```bash
createdb -U postgres laba4_food_safety_db
```

Или через SQL в pgAdmin:

```sql
CREATE DATABASE laba4_food_safety_db;
```

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

В `.env` должна быть строка подключения:

```env
DATABASE_URL=postgresql://postgres:CHANGE_ME@127.0.0.1:5432/laba4_food_safety_db
JWT_SECRET=change_this_secret_in_production
```

Проверка:

```bash
curl http://127.0.0.1:5001/api/health
```

Ожидаемый ответ:

```json
{"status":"ok","service":"food-safety-api"}
```

## Frontend

```bash
cd ..
npm install
npm run build
```

Папку `build/` можно разместить в `/var/www/html`.

## Apache reverse proxy

Для API добавить в конфигурацию HTTPS-сайта:

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

Затем:

```bash
sudo a2enmod proxy proxy_http headers rewrite
sudo apache2ctl configtest
sudo systemctl restart apache2
```


## Автоматический деплой из GitHub

Для выполнения требования CI/CD в проекте используется `.github/workflows/ci.yml`. После push в ветку `main` или `master` workflow запускает сборку frontend, проверку backend с PostgreSQL и deploy job, который по SSH обновляет сервер.

Подробные настройки описаны в `docs/GITHUB_CICD_DEPLOY.md`.
