# API Reference

> **Docs:** [Architecture](./architecture.md) · [API Reference](./api.md) · [Auth & Security](./auth.md) · [Data Models](./models.md) · [Frontend](./frontend.md) · [Caching](./caching.md) · [Deployment](./deployment.md)

---

Interactive docs available at **`http://localhost:5000/api/v1/docs`** (Swagger UI).
Raw OpenAPI spec at **`http://localhost:5000/api/v1/docs.json`**.

---

## Base URL

```
http://localhost:5000/api/v1
```

## Response Format

All responses follow this envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "message": "Human readable error" }
```

In `development`, errors also include a `stack` field.

---

## Auth Endpoints

All tokens are set/cleared as **httpOnly cookies** — no manual header management needed from the browser.

### `POST /auth/register`
Register a new user.

**Body**
```json
{ "name": "Alice", "email": "alice@example.com", "password": "secret123" }
```

**Response `201`**
```json
{ "success": true, "data": { "user": { "_id": "...", "name": "Alice", "email": "...", "role": "member" } } }
```

**Errors:** `400` validation, `409` email taken

---

### `POST /auth/login`
Login and receive tokens via cookies.

**Body**
```json
{ "email": "alice@example.com", "password": "secret123" }
```

**Response `200`** — sets `accessToken` + `refreshToken` cookies.

**Errors:** `401` invalid credentials

---

### `POST /auth/refresh`
Exchange a valid `refreshToken` cookie for a new token pair.

**Response `200`** — sets new `accessToken` + `refreshToken` cookies.

**Errors:** `401` missing/invalid/reused refresh token

---

### `POST /auth/logout` (protected)
Clear tokens server-side and client-side.

**Response `200`**
```json
{ "success": true, "message": "Logged out" }
```

---

### `GET /auth/me` (protected)
Get the currently authenticated user.

**Response `200`**
```json
{ "success": true, "data": { "_id": "...", "name": "Alice", "email": "...", "role": "member" } }
```

---

## Organization Endpoints

All org endpoints require authentication.

### `GET /orgs`
Get all organizations the current user belongs to (as owner or member).

**Response `200`**
```json
{ "success": true, "data": [ { "_id": "...", "name": "Acme Corp", "owner": { ... }, "members": [...] } ] }
```

---

### `POST /orgs`
Create a new organization. Creator is automatically set as owner and `admin` member.

**Body**
```json
{ "name": "Acme Corp" }
```

**Response `201`**

---

### `GET /orgs/:orgId` — Member only
Get full organization details including members list.

**Errors:** `403` not a member, `404` not found

---

### `DELETE /orgs/:orgId` — Org Admin only
Delete the organization and all associated data.

**Response `200`**
```json
{ "success": true, "message": "Organization deleted" }
```

---

### `POST /orgs/:orgId/members` — Org Admin only
Add a user to the organization.

**Body**
```json
{ "userId": "<userId>", "role": "member" }
```

**Errors:** `404` user/org not found, `409` already a member

---

### `DELETE /orgs/:orgId/members/:userId` — Org Admin only
Remove a member. Cannot remove the org owner.

**Errors:** `400` cannot remove owner

---

### `PATCH /orgs/:orgId/members/:userId/role` — Org Admin only
Update a member's org role.

**Body**
```json
{ "role": "admin" }
```

---

## Task Endpoints

All task endpoints require authentication.

### `GET /orgs/:orgId/tasks` — Member only
Get tasks for an organization.
- **Org admins** see all tasks
- **Members** see only tasks assigned to them

**Response `200`**
```json
{ "success": true, "data": [ { "_id": "...", "title": "...", "status": "todo", "assignedTo": { ... }, "createdBy": { ... } } ] }
```

---

### `POST /orgs/:orgId/tasks` — Member only
Create a task in an organization.

**Body**
```json
{
  "title": "Build login page",
  "description": "Implement JWT auth UI",
  "status": "todo",
  "assignedTo": "<userId or null>"
}
```

**Response `201`**

---

### `PATCH /tasks/:taskId` — Creator / Assignee / Org Admin
Update a task. Only the creator, assignee, or an org admin can update.

**Body** — all fields optional:
```json
{ "title": "...", "description": "...", "status": "in-progress", "assignedTo": "<userId>" }
```

**Errors:** `403` not authorized, `404` not found

---

### `DELETE /tasks/:taskId` — Creator / Org Admin
Delete a task. Only the creator or an org admin can delete.

**Errors:** `403` not authorized, `404` not found

---

## User Endpoints

### `GET /users` (protected)
Get all users. Used by the frontend for the "Add Member" dropdown.

### `GET /users/admin` (protected) — Global Admin only
Full user list, restricted to global admins.

---

## Utility Endpoints

### `GET /api/v1/health`
Health check — no auth required.

**Response `200`**
```json
{
  "API Version": "1.0.0",
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "docs": "/api/v1/docs",
  "Authors": "Madhur-Prakash"
}
```

---

## Error Reference

| Status | Meaning |
|--------|---------|
| `400` | Validation error / bad input |
| `401` | Not authenticated / token expired |
| `403` | Authenticated but not authorized |
| `404` | Resource not found |
| `409` | Conflict (duplicate email, already a member) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## cURL Examples

```bash
# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}'

# Login (saves cookies)
curl -c cookies.txt -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'

# Create org (uses saved cookies)
curl -b cookies.txt -X POST http://localhost:5000/api/v1/orgs \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp"}'

# Create task
curl -b cookies.txt -X POST http://localhost:5000/api/v1/orgs/<orgId>/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Build login page","status":"todo"}'
```
