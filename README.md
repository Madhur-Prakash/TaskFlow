# TaskFlow — Full-Stack Project Management App

A production-ready Trello-like task management application with JWT auth, RBAC, and a Kanban board UI.

---

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Backend   | Node.js, Express, MongoDB, Mongoose     |
| Auth      | JWT (access + refresh), bcrypt, cookies |
| Frontend  | React 18, React Router v6, Axios        |
| Security  | Helmet, rate-limit, mongo-sanitize      |
| Logging   | Winston                                 |
| DevOps    | Docker, docker-compose, Nginx           |

---

## Folder Structure

```
internship-task/
├── backend/
│   ├── src/
│   │   ├── config/         # DB connection
│   │   ├── controllers/    # Request handlers (thin layer)
│   │   ├── services/       # Business logic
│   │   ├── repositories/   # Data access layer
│   │   ├── models/         # Mongoose schemas
│   │   ├── middlewares/    # Auth, RBAC, error handler
│   │   ├── routes/         # Express routers
│   │   ├── validators/     # Joi schemas
│   │   └── utils/          # Logger, AppError, JWT helpers
│   ├── .env
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios client + service modules
│   │   ├── context/        # AuthContext
│   │   ├── components/     # Navbar, Modal, Alert, TaskBoard, ProtectedRoute
│   │   ├── hooks/          # useApi
│   │   └── pages/          # Login, Register, Dashboard, OrgPage, AdminPanel
│   └── Dockerfile
└── docker-compose.yml
```

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

### Backend

```bash
cd backend
npm install
# Edit .env — set JWT_SECRET and MONGO_URI
npm run dev
# Server starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm start
# App starts on http://localhost:3000
```

---

## Quick Start (Docker)

```bash
# From project root
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

---

## Environment Variables (backend/.env)

| Variable               | Description                        |
|------------------------|------------------------------------|
| PORT                   | Server port (default 5000)         |
| MONGO_URI              | MongoDB connection string          |
| JWT_SECRET             | Access token signing secret        |
| JWT_REFRESH_SECRET     | Refresh token signing secret       |
| JWT_EXPIRES_IN         | Access token TTL (e.g. 15m)        |
| JWT_REFRESH_EXPIRES_IN | Refresh token TTL (e.g. 7d)        |
| NODE_ENV               | development / production           |
| CLIENT_URL             | Frontend origin for CORS           |

---

## API Reference

### Auth
| Method | Endpoint               | Auth | Description          |
|--------|------------------------|------|----------------------|
| POST   | /api/v1/auth/register  | No   | Register user        |
| POST   | /api/v1/auth/login     | No   | Login, get tokens    |
| POST   | /api/v1/auth/refresh   | No   | Refresh access token |
| POST   | /api/v1/auth/logout    | Yes  | Logout               |
| GET    | /api/v1/auth/me        | Yes  | Get current user     |

### Organizations
| Method | Endpoint                              | Role        | Description         |
|--------|---------------------------------------|-------------|---------------------|
| GET    | /api/v1/orgs                          | Any         | Get my orgs         |
| POST   | /api/v1/orgs                          | Any         | Create org          |
| GET    | /api/v1/orgs/:orgId                   | Member      | Get org details     |
| DELETE | /api/v1/orgs/:orgId                   | Org Admin   | Delete org          |
| POST   | /api/v1/orgs/:orgId/members           | Org Admin   | Add member          |
| DELETE | /api/v1/orgs/:orgId/members/:userId   | Org Admin   | Remove member       |
| PATCH  | /api/v1/orgs/:orgId/members/:userId/role | Org Admin | Update member role  |

### Tasks
| Method | Endpoint                        | Role        | Description         |
|--------|---------------------------------|-------------|---------------------|
| GET    | /api/v1/orgs/:orgId/tasks       | Member      | Get tasks (filtered by role) |
| POST   | /api/v1/orgs/:orgId/tasks       | Member      | Create task         |
| PATCH  | /api/v1/tasks/:taskId           | Creator/Assignee/Admin | Update task |
| DELETE | /api/v1/tasks/:taskId           | Creator/Admin | Delete task       |

### Users (Admin only)
| Method | Endpoint        | Role  | Description   |
|--------|-----------------|-------|---------------|
| GET    | /api/v1/users   | Admin | List all users|

---

## Sample API Requests

```bash
# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}'

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'

# Create Org (with token)
curl -X POST http://localhost:5000/api/v1/orgs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp"}'

# Create Task
curl -X POST http://localhost:5000/api/v1/orgs/<orgId>/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Build login page","status":"todo"}'
```

---

## RBAC Rules

| Action                  | Global Admin | Org Admin | Member |
|-------------------------|:---:|:---:|:---:|
| Create organization     | ✅  | ✅  | ✅  |
| Delete organization     | ✅  | ✅  | ❌  |
| Add/remove members      | ✅  | ✅  | ❌  |
| View all tasks in org   | ✅  | ✅  | ❌  |
| View assigned tasks     | ✅  | ✅  | ✅  |
| Create task             | ✅  | ✅  | ✅  |
| Update/delete own task  | ✅  | ✅  | ✅  |
| Update/delete any task  | ✅  | ✅  | ❌  |
| View all users          | ✅  | ❌  | ❌  |

---

## Scalability Design

### Current Architecture
- **3-layer backend**: Controller → Service → Repository. Controllers are thin; all business logic lives in services; data access is isolated in repositories — making it trivial to swap MongoDB for another DB.
- **Stateless JWT auth**: Horizontally scalable — any instance can verify tokens without shared session state.
- **Modular routes**: Each domain (auth, orgs, tasks) is a self-contained Express router, ready to be extracted into a microservice.

### Path to Microservices
1. Each `src/routes/*` module maps 1:1 to a potential microservice (AuthService, OrgService, TaskService).
2. The repository layer abstracts the DB — swap to a dedicated DB per service with no service-layer changes.
3. Add an API Gateway (e.g. AWS API Gateway or Kong) in front to route by path prefix.

### Production Additions
- **Redis**: Cache `GET /orgs` and `GET /orgs/:id/tasks` with a short TTL (30s). Invalidate on write.
- **Message Queue** (SQS/RabbitMQ): Emit events (e.g. `member.added`) for async notifications.
- **CDN**: Serve the React build via CloudFront.
- **Monitoring**: Winston logs → CloudWatch / Datadog. Add `/metrics` endpoint for Prometheus.
