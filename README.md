<div align="center">

# TaskFlow

**A production-ready, full-stack project management app**

Trello-like Kanban boards · JWT auth with auto-refresh · Role-based access control · Redis caching · Docker-ready

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)

</div>

---

## Live Demo

Check out TaskFlow: https://taskflow.share.zrok.io/

---

## What is TaskFlow?

TaskFlow is a full-stack task management application where users can create organizations, invite members, and manage tasks on a Kanban board. It features a secure JWT authentication system using httpOnly cookies, role-based access control at both the global and organization level, and a Redis-backed caching layer.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, MongoDB, Mongoose |
| Auth | JWT (access + refresh tokens), bcrypt, httpOnly cookies |
| Frontend | React 18, React Router v6, Axios |
| Cache | Redis (ioredis), read-through with write invalidation |
| Security | Helmet, rate-limit, mongo-sanitize, Joi validation |
| Logging | Winston |
| API Docs | Swagger UI (OpenAPI 3.0) |
| DevOps | Docker, docker-compose |

---

## Quick Start

### Docker (one command)

```bash
git clone https://github.com/Madhur-Prakash/TaskFlow
cd Task-Flow

# Add your secrets to backend/.env first (see Environment Variables)
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Swagger Docs | http://localhost:5000/api/v1/docs |
| Health Check | http://localhost:5000/api/v1/health |

### Local Development

```bash
# Backend
cd backend && npm install
npm run dev          # → http://localhost:5000

# Frontend (new terminal)
cd frontend && npm install
npm start            # → http://localhost:3000
```

**Prerequisites:** Node.js 18+, MongoDB on port 27017, Redis on port 6379 (optional)

---

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/taskflow
REDIS_URL=redis://localhost:6379

JWT_SECRET=your-strong-access-secret-32-chars-min
JWT_REFRESH_SECRET=your-strong-refresh-secret-different
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

---

## Project Structure

```
Task-Flow/
├── backend/
│   ├── src/
│   │   ├── config/         # DB, Redis, Swagger config
│   │   ├── controllers/    # Thin HTTP handlers
│   │   ├── services/       # Business logic + RBAC
│   │   ├── repositories/   # Data access (Mongoose)
│   │   ├── models/         # User, Organization, Task schemas
│   │   ├── middlewares/    # protect, requireOrgMember, errorHandler
│   │   ├── routes/         # authRoutes, orgRoutes, taskRoutes, userRoutes
│   │   ├── validators/     # Joi schemas
│   │   └── utils/          # logger, AppError, asyncHandler, cache, jwt
│   ├── .env
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios client + service modules
│   │   ├── context/        # AuthContext (global auth state)
│   │   ├── components/     # Navbar, Modal, Alert, TaskBoard, ProtectedRoute
│   │   ├── hooks/          # useApi
│   │   └── pages/          # Login, Register, Dashboard, OrgPage, AdminPanel
│   └── Dockerfile
├── docs/                   # Full documentation
├── docker-compose.yml
└── README.md
```

---

## API Overview

Interactive docs: **`http://localhost:5000/api/v1/docs`**

| Domain | Endpoints |
|--------|-----------|
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` |
| Organizations | `GET /orgs` · `POST /orgs` · `GET /orgs/:id` · `DELETE /orgs/:id` · member management |
| Tasks | `GET /orgs/:id/tasks` · `POST /orgs/:id/tasks` · `PATCH /tasks/:id` · `DELETE /tasks/:id` |
| Users | `GET /users` · `GET /users/admin` |

See the full [API Reference →](./docs/api.md)

---

## RBAC

Two role levels — global (on the user) and per-organization (on the membership).

| Action | Global Admin | Org Admin | Member |
|--------|:-----------:|:---------:|:------:|
| Create organization | Yes | Yes | Yes |
| Delete organization | Yes | Yes | No |
| Add / remove members | Yes | Yes | No |
| View all tasks in org | Yes | Yes | No |
| View assigned tasks | Yes | Yes | Yes |
| Create task | Yes | Yes | Yes |
| Update / delete own task | Yes | Yes | Yes |
| Update / delete any task | Yes | Yes | No |
| View all users | Yes | No | No |

See [Auth & Security →](./docs/auth.md)

---

## Auth Design

- Tokens stored in **httpOnly cookies only** — never `localStorage`, immune to XSS
- `accessToken` expires in 15 minutes, `refreshToken` in 7 days
- Refresh tokens are **rotated on every use** — reuse of an old token is rejected
- Axios interceptor handles **silent auto-refresh** — users never see a 401
- On app load, `AuthContext` restores session via `/auth/me` with automatic refresh fallback

See [Auth & Security →](./docs/auth.md)

---

## Caching

Redis read-through cache on the two most-hit endpoints:

| Cached Data | Key | TTL |
|-------------|-----|-----|
| User's org list | `orgs:user:<userId>` | 30s |
| Org details | `orgs:<orgId>` | 30s |
| All tasks in org | `tasks:org:<orgId>` | 30s |
| User's assigned tasks | `tasks:assignee:<userId>:org:<orgId>` | 30s |

Cache is **gracefully degraded** — if Redis is down, the app falls through to MongoDB with no errors.

See [Caching →](./docs/caching.md)

---

## Documentation

| Doc | Description |
|-----|-------------|
| [Architecture](./docs/architecture.md) | 3-layer design, request lifecycle, middleware stack |
| [API Reference](./docs/api.md) | All endpoints, request/response shapes, cURL examples |
| [Auth & Security](./docs/auth.md) | Token flow, RBAC matrix, security middleware |
| [Data Models](./docs/models.md) | MongoDB schemas, indexes, Mongoose patterns |
| [Frontend](./docs/frontend.md) | React structure, routing, components, AuthContext |
| [Caching](./docs/caching.md) | Redis strategy, cache keys, invalidation |
| [Deployment](./docs/deployment.md) | Docker, env vars, production checklist, scaling path |

---

## Author

Built by **[Madhur-Prakash](https://github.com/Madhur-Prakash)**
