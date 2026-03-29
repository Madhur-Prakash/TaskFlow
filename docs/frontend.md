# Frontend

> **Docs:** [Architecture](./architecture.md) · [API Reference](./api.md) · [Auth & Security](./auth.md) · [Data Models](./models.md) · [Frontend](./frontend.md) · [Caching](./caching.md) · [Deployment](./deployment.md)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Routing | React Router v6 |
| HTTP | Axios (with interceptors) |
| Auth state | React Context API |
| Styling | Plain CSS (index.css) |

---

## Folder Structure

```
frontend/src/
├── api/
│   ├── client.js       # Axios instance + auto-refresh interceptor
│   └── index.js        # API service modules (authAPI, orgAPI, taskAPI, userAPI)
├── context/
│   └── AuthContext.jsx # Global auth state + login/logout/register
├── components/common/
│   ├── Navbar.jsx      # Top nav with user info + logout
│   ├── ProtectedRoute.jsx
│   ├── TaskBoard.jsx   # Kanban board component
│   ├── Modal.jsx       # Reusable modal wrapper
│   └── Alert.jsx       # Error/success alert banner
├── hooks/
│   └── useApi.js       # Generic loading/error wrapper for API calls
├── pages/
│   ├── auth/           # Login.jsx, Register.jsx
│   ├── dashboard/      # Dashboard.jsx — org list
│   ├── org/            # OrgPage.jsx — org detail + members + tasks
│   └── admin/          # AdminPanel.jsx — user list (admin only)
├── App.jsx             # Router + AuthProvider setup
└── index.js            # React entry point
```

---

## Routing

| Path | Component | Guard |
|------|-----------|-------|
| `/login` | `Login` | Redirects to `/dashboard` if logged in |
| `/register` | `Register` | Redirects to `/dashboard` if logged in |
| `/dashboard` | `Dashboard` | `ProtectedRoute` |
| `/orgs/:orgId` | `OrgPage` | `ProtectedRoute` |
| `/admin` | `AdminPanel` | `ProtectedRoute` + `adminOnly` |
| `*` | — | Redirects to `/dashboard` or `/login` |

---

## AuthContext

Provides `{ user, loading, login, register, logout }` to the entire app.

**Startup flow:**
1. On mount, calls `GET /auth/me`
2. If the access token cookie is valid → sets `user`
3. If expired → Axios interceptor auto-calls `POST /auth/refresh` and retries
4. If refresh also fails → `user` stays `null` → `ProtectedRoute` redirects to `/login`

**login / register:** Call the API, set `user` from response.

**logout:** Calls `POST /auth/logout` (clears server-side refresh token + cookies), sets `user = null`.

---

## API Client (`client.js`)

```
Axios instance
  baseURL: /api/v1
  withCredentials: true   ← sends cookies automatically on every request

Response interceptor:
  401 received
    → POST /auth/refresh  (refreshToken cookie sent automatically)
    → retry original request
    → if refresh fails → window.location.href = '/login'
```

No tokens are stored in `localStorage` — everything is cookie-based.

---

## API Services (`index.js`)

```js
authAPI  → /auth/*
orgAPI   → /orgs/*
taskAPI  → /orgs/:orgId/tasks, /tasks/:taskId
userAPI  → /users
```

---

## ProtectedRoute

```jsx
<ProtectedRoute adminOnly?>
  {children}
</ProtectedRoute>
```

- Shows `Loading...` while `AuthContext` is resolving
- Redirects to `/login` if no user
- Redirects to `/dashboard` if `adminOnly` and `user.role !== 'admin'`

---

## TaskBoard Component

Kanban board with three columns: **TODO**, **IN-PROGRESS**, **DONE**.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `tasks` | `Task[]` | Current task list |
| `setTasks` | `fn` | State setter to update task list |
| `orgId` | `string` | Current org ID |
| `members` | `Member[]` | Org members for assignee dropdown |
| `currentUserId` | `string` | Logged-in user's ID |
| `orgRole` | `string` | `'admin'` or `'member'` |

**Edit permissions** (mirrors backend RBAC):
- Org admin → can edit/delete any task
- Creator → can edit/delete own task
- Assignee → can edit assigned task

---

## useApi Hook

Generic wrapper for API calls with loading/error state.

```js
const { loading, error, execute, setError } = useApi();

// Usage
const data = await execute(orgAPI.getOne, orgId);
// loading = true during call, error set on failure
```

---

## Pages

### Dashboard
- Loads all orgs for the current user on mount
- Create org via modal
- Each org card links to `/orgs/:orgId`

### OrgPage
- Loads org details, tasks, and all users in parallel (`Promise.all`)
- Members section: add/remove members, change roles (admin only)
- Tasks section: `TaskBoard` component
- Delete org button (admin only)

### AdminPanel
- Lists all users with name, email, role, join date
- Accessible only to global admins

### Login / Register
- Form with validation feedback via `Alert`
- On success → navigate to `/dashboard`
