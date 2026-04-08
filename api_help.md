# Справка по API SupportDesk

SupportDesk предоставляет два типа API: **Внешнее API** (для интеграции с другими системами через API-ключ) и **Внутреннее API** (используется веб-интерфейсом через JWT-токен).

## Примеры использования
### Пример через cURL (Linux/macOS/Windows Terminal):
```
curl -X POST https://desk.fkviking.com/api/external/tickets \
     -H "x-api-key: viking_api_key_for_external_services" \
     -H "Content-Type: application/json" \
     -d '{
       "subject": "Тестовая заявка через API",
       "description": "Это описание заявки, созданной удаленно",
       "clientUsername": "admin"
     }'
```
### Пример на JavaScript (fetch):
```
const createTicket = async () => {
  const response = await fetch('https://desk.fkviking.com/api/external/tickets', {
    method: 'POST',
    headers: {
      'x-api-key': 'viking_api_key_for_external_services',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subject: 'Заголовок заявки',
      description: 'Текст обращения',
      clientUsername: 'admin' // Логин пользователя в системе
    })
  });

  const data = await response.json();
  console.log(data);
};

createTicket();
```
### Пример на Python:
```
import requests

url = "https://desk.fkviking.com/api/external/tickets"
headers = {
    "x-api-key": "viking_api_key_for_external_services",
    "Content-Type": "application/json"
}
data = {
    "subject": "Заявка из Python",
    "description": "Описание проблемы",
    "clientUsername": "admin"
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```
---

## 1. Внешнее API (X-API-KEY)

Все запросы должны содержать заголовок:
`X-API-KEY: ваш_ключ_для_внешнего_api`

По умолчанию ключ: `your_api_key_here` (настраивается в `.env`).

### Заявки (Tickets)

#### Получение списка всех заявок
`GET /api/external/tickets`
Возвращает список всех заявок в системе.

#### Получение деталей заявки и сообщений
`GET /api/external/tickets/:id`
Возвращает полную информацию о заявке и историю переписки.

#### Создание новой заявки
`POST /api/external/tickets`
**Тело (JSON):**
```json
{
  "subject": "Тема",
  "description": "Описание",
  "clientUsername": "логин_клиента"
}
```

#### Обновление заявки
`PATCH /api/external/tickets/:id`
**Тело (JSON):**
```json
{
  "status": "open", // new, open, pending, resolved, closed
  "priority": "high", // low, medium, high, critical
  "assignedToUsername": "логин_сотрудника"
}
```

#### Добавление сообщения/заметки
`POST /api/external/tickets/:id/messages`
**Тело (JSON):**
```json
{
  "text": "Текст сообщения",
  "senderUsername": "логин_отправителя",
  "isInternal": false // true для внутренних заметок
}
```

### Пользователи (Users)

#### Список пользователей
`GET /api/external/users`

#### Создание пользователя
`POST /api/external/users`
**Тело (JSON):**
```json
{
  "username": "user1",
  "password": "password123",
  "fullName": "Имя Фамилия",
  "role": "client" // admin, support, client
}
```

#### Удаление пользователя
`DELETE /api/external/users/:id`

### Статистика (Stats)

#### Получение статистики
`GET /api/external/stats`

---

## 2. Внутреннее API (Bearer Token)

Используется для авторизованных пользователей. Требует заголовок:
`Authorization: Bearer <ваш_jwt_токен>`

### Аутентификация

`POST /api/auth/login`
**Тело:** `{"username": "...", "password": "..."}`
**Ответ:** `{"token": "...", "user": {...}}`

`GET /api/auth/me`
**Заголовок:** `Authorization: Bearer <token>`
**Ответ:** `{"user": {...}}` — Проверка текущего токена и получение данных пользователя.

### Заявки (Tickets)

- `GET /api/tickets` — Список заявок (клиенты видят только свои).
- `GET /api/tickets/:id` — Детали заявки.
- `POST /api/tickets` — Создание (subject, description).
- `PATCH /api/tickets/:id` — Обновление (status, priority, assigned_to).
- `POST /api/tickets/:id/messages` — Добавление сообщения (text, media_url, is_internal).

### Администрирование (Admin)

Доступно только пользователям с ролью `admin`.

- `GET /api/admin/users` — Список всех пользователей.
- `POST /api/admin/users` — Создание пользователя.
- `DELETE /api/admin/users/:id` — Удаление пользователя.
- `GET /api/admin/stats` — Общая статистика системы.

---

## Коды ответов

- **200 OK**: Успешно.
- **201 Created**: Создано.
- **400 Bad Request**: Ошибка в параметрах.
- **401 Unauthorized**: Ошибка авторизации (ключ или токен).
- **403 Forbidden**: Доступ запрещен (недостаточно прав).
- **404 Not Found**: Не найдено.
- **500 Internal Server Error**: Ошибка сервера.
