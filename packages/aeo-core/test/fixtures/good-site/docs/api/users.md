# Users API

The Users API lets you manage user accounts. All endpoints require a valid Bearer token.

## List Users

`GET /v2/users`

### Parameters

| Name     | Type    | Required | Description                          |
|----------|---------|----------|--------------------------------------|
| page     | integer | No       | Page number (default: 1)             |
| per_page | integer | No       | Items per page (default: 20, max: 100) |
| status   | string  | No       | Filter by status: active, inactive   |

### Example

```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://api.example.com/v2/users?page=1&per_page=10"
```

## Create User

`POST /v2/users`

### Request Body

| Field | Type   | Required | Description                            |
|-------|--------|----------|----------------------------------------|
| email | string | Yes      | User email address                     |
| name  | string | Yes      | Display name                           |
| role  | string | No       | Role: admin, member (default: member)  |

### Example

```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@co.com","name":"Jane"}' \
  https://api.example.com/v2/users
```

## Related

- [Getting Started](/docs/getting-started.html)
- [View as HTML](/docs/api/users.html)
