# Architecture

> **Docs:** [Architecture](./architecture.md) · [API Reference](./api.md) · [Auth & Security](./auth.md) · [Data Models](./models.md) · [Frontend](./frontend.md) · [Caching](./caching.md) · [Deployment](./deployment.md)

---

## Overview

TaskFlow follows a classic **3-layer backend** architecture with a decoupled React frontend.

```
Browser (React)
     │  HTTP + httpOnly cookies
     ▼
Express API (Node.js)
  ├── Controllers   ← thin, only HTTP in/out
  ├── Services      ← all business logic & RBAC
  └── Repositories  ← all DB queries (Mongoose)
         │
         ▼
    MongoDB  +  Redis (cache)
```

---

## Backend Layers

### Controllers
Thin HTTP adapters. They extract data from `req`, call a service, and send a response. Zero business logic.

| File | Responsibility |
|------|---------------|
| `authController.js` | Register, login, refresh, logout, me |
| `orgController.js` | CRUD for organizations + member management |
| `taskController.js` | CRUD for tasks |
| `userController.js` | List users (admin) |

### Services
All business logic lives here — RBAC checks, cache invalidation, error throwing.

| File | Key Logic |
|------|-----------|
| `authService.js` | Password hashing, token generation, refresh token rotation |
| `orgService.js` | Org creation, member add/remove/role, cache read-through |
| `taskService.js` | Task visibility by role, update/delete authorization |

### Repositories
Pure data access — one file per model, no logic.

| File | Model |
|------|-------|
| `userRepo.js` | `User` |
| `orgRepo.js` | `Organization` |
| `taskRepo.js` | `Task` |

---

## Request Lifecycle

```
Request
  → Helmet (security headers)
  → CORS
  → Mongo Sanitize
  → Rate Limiter (auth routes only)
  → JSON Parser
  → Cookie Parser
  → Morgan (dev logging)
  → Route Handler
      → protect middleware (JWT verify)
      → requireOrgMember / requireOrgAdmin (RBAC)
      → Joi Validator
      → Controller → Service → Repository
  → Response
  → errorHandler (catches all thrown AppErrors)
```

---

## Middleware Stack

| Middleware | Scope | Purpose |
|-----------|-------|---------|
| `helmet` | Global | Security headers |
| `cors` | Global | Allow `CLIENT_URL` origin with credentials |
| `mongoSanitize` | Global | Strip `$` operators from req body |
| `rateLimit` | `/api/v1/auth` | 20 req / 15 min |
| `protect` | Protected routes | Verify `accessToken` cookie → attach `req.user` |
| `requireOrgMember` | Org routes | Verify user is org member → attach `req.org`, `req.orgRole` |
| `requireOrgAdmin` | Admin org routes | Verify `req.orgRole === 'admin'` |
| `errorHandler` | Global (last) | Normalize all errors to JSON |

---

## Scalability Path

The architecture is designed to split into microservices with minimal changes:

1. Each route module (`auth`, `orgs`, `tasks`) maps 1:1 to a potential microservice
2. The repository layer abstracts the DB — swap to a per-service DB with no service changes
3. Add an API Gateway (AWS API Gateway / Kong) to route by path prefix
4. Redis cache is already in place — extend TTLs and add SQS for async events

See [Deployment](./deployment.md) for production infrastructure details.
