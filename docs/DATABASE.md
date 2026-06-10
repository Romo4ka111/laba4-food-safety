# Структура базы данных

СУБД: **PostgreSQL**. Базу можно открыть и проверить через **pgAdmin**.

Рекомендуемое имя базы для локального запуска: `laba4_food_safety_db`.

## Подключение

Backend получает строку подключения из переменной окружения `DATABASE_URL`:

```env
DATABASE_URL=postgresql://postgres:CHANGE_ME@127.0.0.1:5432/laba4_food_safety_db
```

## Таблица `users`

Пользователи системы.

| Поле | Тип | Назначение |
|---|---|---|
| `id` | `TEXT` | первичный ключ |
| `name` | `TEXT` | логин пользователя, уникальный |
| `email` | `TEXT` | email, уникальный |
| `password_hash` | `TEXT` | bcrypt-хеш пароля |
| `role` | `TEXT` | роль: `user`, `specialist`, `admin` |
| `status` | `TEXT` | статус: `active`, `blocked` |
| `created_at` | `TIMESTAMPTZ` | дата создания |
| `updated_at` | `TIMESTAMPTZ` | дата обновления |

## Таблица `inspections`

Проверки пищевой продукции.

| Поле | Тип | Назначение |
|---|---|---|
| `id` | `TEXT` | первичный ключ |
| `name` | `TEXT` | название проверки |
| `enterprise` | `TEXT` | предприятие |
| `product` | `TEXT` | проверяемая продукция |
| `risk_level` | `TEXT` | уровень риска |
| `status` | `TEXT` | статус проверки |
| `date` | `DATE` | дата проверки |
| `description` | `TEXT` | описание |
| `created_by` | `TEXT` | ссылка на `users.id` |
| `assigned_user_id` | `TEXT` | ответственный пользователь, ссылка на `users.id` |
| `created_at` | `TIMESTAMPTZ` | дата создания |
| `updated_at` | `TIMESTAMPTZ` | дата обновления |

## Таблица `audit_logs`

Журнал действий пользователей.

| Поле | Тип | Назначение |
|---|---|---|
| `id` | `TEXT` | первичный ключ |
| `user_id` | `TEXT` | пользователь, ссылка на `users.id`; может быть `NULL` для системных событий |
| `action` | `TEXT` | тип действия |
| `entity_type` | `TEXT` | тип сущности |
| `entity_id` | `TEXT` | идентификатор объекта |
| `details` | `TEXT` | подробности события |
| `ip` | `TEXT` | IP-адрес клиента |
| `created_at` | `TIMESTAMPTZ` | дата события |

## Связи

- `users.id` → `inspections.created_by`;
- `users.id` → `inspections.assigned_user_id`;
- `users.id` → `audit_logs.user_id`.

При удалении пользователя связанные поля в проверках и журнале переводятся в `NULL`, чтобы история действий не терялась.

## Индексы

Для ускорения выборок создаются индексы:

- `idx_inspections_status`;
- `idx_inspections_risk_level`;
- `idx_inspections_created_by`;
- `idx_audit_logs_user_id`;
- `idx_audit_logs_created_at`.

## Тестовые пользователи

При первом запуске backend автоматически создаёт тестовых пользователей:

| Логин | Пароль | Роль |
|---|---|---|
| `admin` | `Admin12345` | `admin` |
| `specialist` | `Spec12345` | `specialist` |
| `user` | `User12345` | `user` |

## SQL-схема для pgAdmin

Файл `backend/schema.sql` можно открыть в pgAdmin через Query Tool и выполнить вручную. Backend также создаёт эти таблицы автоматически при первом запуске.
