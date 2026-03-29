# Deployment

> **Docs:** [Architecture](./architecture.md) · [API Reference](./api.md) · [Auth & Security](./auth.md) · [Data Models](./models.md) · [Frontend](./frontend.md) · [Caching](./caching.md) · [Deployment](./deployment.md)

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB on `localhost:27017`
- Redis on `localhost:6379` (optional — app works without it)

### Backend
```bash
cd backend
npm install
# configure backend/.env (see Environment Variables below)
npm run dev
# → http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

---

## Docker (Recommended)

```bash
# From project root
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| MongoDB | localhost:27017 |
| Redis | localhost:6379 |

### Services in docker-compose.yml

| Service | Image | Notes |
|---------|-------|-------|
| `mongo` | `mongo:7` | Persisted via `mongo_data` volume |
| `redis` | `redis:7-alpine` | In-memory, no persistence |
| `backend` | Custom Dockerfile | Reads `backend/.env`, overrides `MONGO_URI` and `REDIS_URL` |
| `frontend` | Custom Dockerfile | Nginx serves the React build on port 80 |

Backend logs are mounted to `./backend/logs` on the host.

---

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/taskflow
REDIS_URL=redis://localhost:6379

JWT_SECRET=your-strong-access-secret
JWT_REFRESH_SECRET=your-strong-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default 5000) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `REDIS_URL` | No | Redis URL — app works without it |
| `JWT_SECRET` | Yes | Access token signing secret (use 32+ random chars) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret (different from JWT_SECRET) |
| `JWT_EXPIRES_IN` | Yes | Access token TTL e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Yes | Refresh token TTL e.g. `7d` |
| `NODE_ENV` | Yes | `development` or `production` |
| `CLIENT_URL` | Yes | Frontend origin for CORS e.g. `http://localhost:3000` |

---

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique values for `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Set `CLIENT_URL` to your actual frontend domain
- [ ] Enable HTTPS — cookies use `secure: true` in production
- [ ] Point `MONGO_URI` to a managed MongoDB (Atlas, DocumentDB)
- [ ] Point `REDIS_URL` to a managed Redis (ElastiCache, Upstash)
- [ ] Mount a persistent volume for `backend/logs`

---

## Logging

Winston is configured in `utils/logger.js`:

| Environment | Log Level | Transports |
|-------------|-----------|-----------|
| `development` | `debug` | Console + `logs/error.log` + `logs/combined.log` |
| `production` | `warn` | Console + `logs/error.log` + `logs/combined.log` |

Morgan HTTP request logging is enabled in `development` only.

For production, pipe the log files or console output to **CloudWatch**, **Datadog**, or **Loki**.

---

## Scaling Path

```
Current: Single Node.js process + MongoDB + Redis

Step 1 — Horizontal scaling
  → Run multiple backend instances behind a load balancer
  → JWT is stateless — any instance can verify tokens
  → Redis is shared — cache is consistent across instances

Step 2 — Microservices
  → Split routes into AuthService / OrgService / TaskService
  → Each service gets its own DB (repository layer already abstracts this)
  → Add API Gateway (AWS API Gateway / Kong) to route by path prefix

Step 3 — Async events
  → Emit domain events (member.added, task.created) to SQS / RabbitMQ
  → Notification service consumes events independently

Step 4 — CDN
  → Serve React build via CloudFront
  → Cache static assets at edge
```
