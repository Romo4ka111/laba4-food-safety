# Backup и сопровождение

## Какие данные копируются

Основные данные хранятся в PostgreSQL-базе `laba4_food_safety_db`:

- пользователи;
- проверки пищевой продукции;
- журнал действий;
- роли и статусы пользователей.

## Резервное копирование

Рекомендуется выполнять ежедневный backup через `pg_dump`:

```bash
mkdir -p /home/romanalx/backups
pg_dump "$DATABASE_URL" > /home/romanalx/backups/food_safety_$(date +%F-%H%M).sql
```

Если переменная `DATABASE_URL` не задана:

```bash
pg_dump -U postgres -h 127.0.0.1 laba4_food_safety_db \
  > /home/romanalx/backups/food_safety_$(date +%F-%H%M).sql
```

## Восстановление

1. Остановить backend.
2. Создать пустую базу или очистить старую.
3. Выполнить восстановление:

```bash
psql -U postgres -h 127.0.0.1 laba4_food_safety_db < backup.sql
```

4. Запустить backend и проверить `/api/health`.

## Мониторинг

Контролируются:

- доступность backend `/api/health`;
- ошибки авторизации;
- попытки доступа без токена;
- попытки доступа без роли;
- ошибки PostgreSQL;
- заполнение журнала действий;
- место на диске для резервных копий.

## Логи

- HTTP-логи пишет `morgan`;
- действия пользователей сохраняются в таблицу `audit_logs`;
- ошибки сервера фиксируются middleware `errorHandler`.

## Обновление приложения

1. Сделать backup PostgreSQL.
2. Обновить исходники.
3. Выполнить `npm install` в backend и frontend при необходимости.
4. Собрать frontend через `npm run build`.
5. Перезапустить backend.
6. Проверить `/api/health`, вход, CRUD, админку и журнал действий.
