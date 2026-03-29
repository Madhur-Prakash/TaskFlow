# Data Models

> **Docs:** [Architecture](./architecture.md) · [API Reference](./api.md) · [Auth & Security](./auth.md) · [Data Models](./models.md) · [Frontend](./frontend.md) · [Caching](./caching.md) · [Deployment](./deployment.md)

---

## User

```
users collection
├── _id          ObjectId
├── name         String  (required, 2–50)
├── email        String  (required, unique, lowercase)
├── password     String  (bcrypt hashed, select: false)
├── role         String  enum: ['admin', 'member']  default: 'member'
├── refreshToken String  (select: false)
├── createdAt    Date
└── updatedAt    Date
```

**Notes:**
- `password` and `refreshToken` are excluded from all queries by default (`select: false`) — must be explicitly requested
- `toJSON()` strips `password` and `refreshToken` before serialization
- Password is hashed with bcrypt (cost factor 12) via a `pre('save')` hook
- `comparePassword(candidate)` method available for login verification

---

## Organization

```
organizations collection
├── _id      ObjectId
├── name     String  (required, 2–100)
├── owner    ObjectId → User  (required)
├── members  [MemberSchema]
│   ├── user   ObjectId → User
│   └── role   String  enum: ['admin', 'member']  default: 'member'
├── createdAt Date
└── updatedAt Date
```

**Notes:**
- `members` is an embedded array — no separate collection
- `_id` is disabled on the member subdocument (`_id: false`)
- The `owner` is stored separately from `members` — org service treats owner as implicit `admin`
- `findById` and `findByOwnerOrMember` populate `owner` and `members.user` with `name` and `email`

---

## Task

```
tasks collection
├── _id          ObjectId
├── title        String  (required, 1–200)
├── description  String  (default: '')
├── status       String  enum: ['todo', 'in-progress', 'done']  default: 'todo'
├── assignedTo   ObjectId → User  (nullable)
├── organization ObjectId → Organization  (required)
├── createdBy    ObjectId → User  (required)
├── createdAt    Date
└── updatedAt    Date
```

**Indexes:**
- Compound index on `{ organization: 1, status: 1 }` — optimizes the Kanban board query (filter by org + group by status)

---

## Relationships

```
User ──< Organization (as owner)
User ──< Organization.members (as member)
Organization ──< Task
User ──< Task (as createdBy)
User ──< Task (as assignedTo, nullable)
```

---

## Mongoose Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| `select: false` | `password`, `refreshToken` | Never leak sensitive fields |
| `pre('save')` hook | `User.password` | Auto-hash on create/update |
| `toJSON()` override | `User` | Strip sensitive fields from API responses |
| Compound index | `Task` | Query performance for Kanban board |
| `populate()` | All repos | Resolve ObjectId refs to name/email |
| `{ new: true, runValidators: true }` | `taskRepo.update` | Return updated doc + enforce schema rules |
