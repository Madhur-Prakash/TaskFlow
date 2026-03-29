# Caching

> **Docs:** [Architecture](./architecture.md) · [API Reference](./api.md) · [Auth & Security](./auth.md) · [Data Models](./models.md) · [Frontend](./frontend.md) · [Caching](./caching.md) · [Deployment](./deployment.md)

---

## Overview

TaskFlow uses **Redis** as an optional read-through cache for the two most frequently hit read endpoints. The cache layer is **gracefully degraded** — if Redis is unavailable, all operations fall through to MongoDB silently.

---

## Cache Keys

| Key Pattern | Data | TTL |
|-------------|------|-----|
| `orgs:user:<userId>` | All orgs for a user | 30s |
| `orgs:<orgId>` | Single org with members | 30s |
| `tasks:org:<orgId>` | All tasks in an org (admin view) | 30s |
| `tasks:assignee:<userId>:org:<orgId>` | Tasks assigned to a user in an org | 30s |

---

## Read-Through Pattern

```
GET /orgs
  → cache.get('orgs:user:<userId>')
      hit  → return cached data
      miss → orgRepo.findByOwnerOrMember(userId)
           → cache.set('orgs:user:<userId>', data, 30)
           → return data
```

Same pattern applies to `getOrgById` and `getOrgTasks`.

---

## Cache Invalidation

Invalidation is **write-through** — any mutation clears affected keys immediately.

### Org mutations
Any change to an org (create, add/remove member, update role, delete) calls `invalidateOrg(orgId, memberUserIds)` which deletes:
- `orgs:<orgId>`
- `orgs:user:<userId>` for every member

### Task mutations
Any task create/update/delete calls `invalidateOrgTasks(orgId)` which deletes:
- `tasks:org:<orgId>`
- All keys matching `tasks:assignee:*:org:<orgId>` (pattern delete via `KEYS` + `DEL`)

---

## Redis Client (`config/redis.js`)

```js
getClient()  // returns ioredis client or null if disconnected
```

- `lazyConnect: true` — doesn't connect until first use
- `maxRetriesPerRequest: 1` — fails fast, doesn't block requests
- `enableOfflineQueue: false` — commands fail immediately if disconnected
- On error: client is reset to `null` so the next call retries the connection

The `cache` utility (`utils/cache.js`) wraps all Redis calls in try/catch — a Redis failure logs a warning and returns `null` (cache miss), keeping the app fully functional.

---

## Running Without Redis

Redis is **optional in development**. If `REDIS_URL` is not set or Redis is unreachable:
- All `cache.get()` calls return `null` (miss)
- All `cache.set()` / `cache.del()` calls are no-ops
- The app works normally, just without caching

In Docker, Redis is always available via the `redis` service.
