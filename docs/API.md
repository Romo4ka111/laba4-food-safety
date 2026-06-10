# Документация REST API

Базовый адрес: `/api`

Формат данных: JSON.

Для защищённых запросов используется заголовок:

```http
Authorization: Bearer <JWT_TOKEN>
```

## Аутентификация

| Метод | Эндпоинт | Назначение | Доступ |
|---|---|---|---|
| POST | `/auth/register` | регистрация пользователя | открытый |
| POST | `/auth/login` | вход и получение JWT | открытый |
| GET | `/auth/me` | получение текущего пользователя | user, specialist, admin |
| POST | `/auth/refresh` | обновление JWT | user, specialist, admin |
| POST | `/auth/logout` | выход и запись события в журнал | user, specialist, admin |
| GET | `/profile` | защищённый профиль текущего пользователя | user, specialist, admin |

### POST /auth/register

Запрос:

```json
{
  "name": "ivan",
  "email": "ivan@example.local",
  "password": "Password123"
}
```

Ответ 201:

```json
{
  "message": "Регистрация выполнена успешно.",
  "user": {
    "id": "...",
    "name": "ivan",
    "email": "ivan@example.local",
    "role": "user",
    "status": "active"
  }
}
```

### POST /auth/login

Запрос:

```json
{
  "login": "admin",
  "password": "Admin12345"
}
```

Ответ 200:

```json
{
  "message": "Вход выполнен успешно.",
  "token": "jwt-token",
  "user": {
    "name": "admin",
    "role": "admin"
  }
}
```

## Проверки

| Метод | Эндпоинт | Назначение | Доступ |
|---|---|---|---|
| GET | `/inspections` | список проверок, поиск, фильтрация, сортировка, пагинация | user, specialist, admin |
| GET | `/inspections/:id` | карточка проверки | user, specialist, admin |
| POST | `/inspections` | создание проверки | user, specialist, admin |
| PUT | `/inspections/:id` | изменение проверки | user, specialist, admin |
| DELETE | `/inspections/:id` | удаление проверки | user, specialist, admin |
| GET | `/inspections/export.csv` | выгрузка списка проверок в CSV с учётом фильтров и сортировки | user, specialist, admin |

Для совместимости со старым сайтом также работает `/api/items`.

### GET /inspections

Параметры:

- `page` — номер страницы;
- `limit` — количество записей;
- `q` — поиск по названию, предприятию и продукции;
- `riskLevel` — уровень риска;
- `status` — статус проверки;
- `sortBy` — поле сортировки: `date`, `name`, `enterprise`, `product`, `riskLevel`, `status`, `createdAt`;
- `sortOrder` — направление сортировки: `asc` или `desc`.

Пример:

```http
GET /api/inspections?page=1&limit=6&riskLevel=Высокий&sortBy=date&sortOrder=desc
```

Ответ 200:

```json
{
  "items": [],
  "total": 3,
  "page": 1,
  "limit": 6,
  "totalPages": 1,
  "sortBy": "date",
  "sortOrder": "desc"
}
```

### GET /inspections/export.csv

Возвращает CSV-файл для отчётности или передачи результатов проверки. Поддерживает те же параметры фильтрации и сортировки, что и список проверок. Операция фиксируется в журнале аудита как `INSPECTIONS_EXPORTED`.

### POST /inspections

```json
{
  "name": "Проверка партии молока",
  "enterprise": "ООО Молоко",
  "product": "Молоко",
  "riskLevel": "Средний",
  "status": "Новая",
  "date": "2026-05-25",
  "description": "Плановая проверка"
}
```

Ответ 201 — созданная запись.

## Пользователи

| Метод | Эндпоинт | Назначение | Доступ |
|---|---|---|---|
| GET | `/users` | список пользователей | admin |
| PUT | `/users/:id` | изменение роли или статуса | admin |
| GET | `/admin/users` | альтернативный административный путь к списку пользователей | admin |
| PUT | `/admin/users/:id` | альтернативный административный путь изменения роли или статуса | admin |

## Журнал действий

| Метод | Эндпоинт | Назначение | Доступ |
|---|---|---|---|
| GET | `/audit-log` | просмотр журнала действий | admin |

## Коды ответов

| Код | Значение |
|---|---|
| 200 | успешный запрос |
| 201 | объект создан |
| 204 | объект удалён |
| 400 | ошибка входных данных |
| 401 | нет авторизации или токен недействителен |
| 403 | недостаточно прав |
| 404 | объект не найден |
| 409 | конфликт данных |
| 500 | внутренняя ошибка сервера |


## Swagger/OpenAPI

Файл `docs/OPENAPI.yaml` содержит машинно-читаемое описание API: методы, параметры, ответы, JWT-защиту и роли доступа. Его можно открыть в Swagger Editor или подключить к Swagger UI.
