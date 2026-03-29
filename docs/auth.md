# Auth & Security

> **Docs:** [Architecture](./architecture.md) · [API Reference](./api.md) · [Auth & Security](./auth.md) · [Data Models](./models.md) · [Frontend](./frontend.md) · [Caching](./caching.md) · [Deployment](./deployment.md)

---

## Token Strategy

TaskFlow uses a **dual-token, httpOnly cookie** approach — no tokens in `localStorage`.

| Token | Storage | TTL | Purpose |
|-------|---------|-----|---------|
| `accessToken` | httpOnly cookie | 15 min | Authenticate API requests |
| `refreshToken` | httpOnly cookie | 7 days | Issue new access tokens |

Both cookies are set with:
- `httpOnly: true` — inaccessible to JavaScript (XSS-safe)
- `secure: true` in production — HTTPS only
- `sameSite: strict` — CSRF-safe

---

## Auth Flow

### Login / Register
```
POST /auth/login
  → authService.login()
      → verify password (bcrypt)
      → generateTokens(userId, role)
      → store refreshToken hash in User.refreshToken
      → setTokenCookies(res, accessToken, refreshToken)
  ← 200 + { user } (cookies set in response headers)
```

### Authenticated Request
```
Any protected route
  → protect middleware
      → read req.cookies.accessToken
      → verifyToken(token, JWT_SECRET)
      → User.findById(decoded.id) → req.user
  → controller
```

### Token Refresh
```
POST /auth/refresh
  → read req.cookies.refreshToken
  → verifyToken(token, JWT_REFRESH_SECRET)
  → compare with stored User.refreshToken (rotation check)
  → generateTokens() — new pair
  → update User.refreshToken
  → setTokenCookies(res, ...) — new cookies
  ← 200 + { accessToken }
```

Refresh tokens are **rotated on every use** — a reused refresh token is rejected (stolen token detection).

### Auto-Refresh (Frontend)
The Axios response interceptor in `client.js` handles this transparently:
```
401 response
  → POST /auth/refresh (sends refreshToken cookie automatically)
  → retry original request with new accessToken cookie
  → if refresh also fails → redirect to /login
```

On app startup, `AuthContext` calls `/auth/me`. If the access token is expired, the interceptor auto-refreshes before the user sees anything.

### Logout
```
POST /auth/logout
  → authService.logout(userId)
      → User.refreshToken = null (invalidates refresh token server-side)
  → res.clearCookie('accessToken')
  → res.clearCookie('refreshToken')
```

---

## RBAC

Two levels of roles:

### Global Role (on User model)
| Role | Access |
|------|--------|
| `admin` | Can view all users via `/api/v1/users/admin` |
| `member` | Standard access |

### Org Role (on Organization.members[].role)
| Role | Access |
|------|--------|
| `admin` | Full org control — manage members, view all tasks, update/delete any task |
| `member` | View own assigned tasks, create tasks, update/delete own tasks only |

The org owner is always treated as `admin` regardless of their `members` entry.

### RBAC Matrix

| Action | Global Admin | Org Admin | Member |
|--------|:---:|:---:|:---:|
| Create organization | ✅ | ✅ | ✅ |
| Delete organization | ✅ | ✅ | ❌ |
| Add / remove members | ✅ | ✅ | ❌ |
| View all tasks in org | ✅ | ✅ | ❌ |
| View assigned tasks | ✅ | ✅ | ✅ |
| Create task | ✅ | ✅ | ✅ |
| Update / delete own task | ✅ | ✅ | ✅ |
| Update / delete any task | ✅ | ✅ | ❌ |
| View all users | ✅ | ❌ | ❌ |

---

## Security Middleware

| Layer | Package | What it does |
|-------|---------|-------------|
| Security headers | `helmet` | Sets `X-Frame-Options`, `CSP`, `HSTS`, etc. |
| NoSQL injection | `express-mongo-sanitize` | Strips `$` and `.` from req body/params |
| Rate limiting | `express-rate-limit` | 20 requests / 15 min on all `/auth` routes |
| Body size | `express.json({ limit: '10kb' })` | Prevents large payload attacks |
| Input validation | `joi` | Schema validation on all mutating endpoints |

---

## Validation Schemas

All request bodies are validated with Joi before reaching controllers.

| Schema | Rules |
|--------|-------|
| `register` | name (2–50), email, password (min 6) |
| `login` | email, password |
| `createOrg` | name (2–100) |
| `addMember` | userId (required), role (admin\|member) |
| `createTask` | title (1–200), description (max 1000), status, assignedTo |
| `updateTask` | all fields optional, same constraints |
