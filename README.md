# TaskForge API

A small task-and-project management HTTP API built on Express and SQLite, instrumented with Sentry for error reporting and performance monitoring.

This codebase is a **synthetic test bed** for an emergency-response agent: it looks like a real service but contains a curated set of planted bugs across P0–P4 severities. See `BUGS.md` for the manifest of what's planted and where.

## Stack

- Node.js 18+ / Express 4
- SQLite (`better-sqlite3`) for storage
- `@sentry/node` v8 with profiling and console integrations
- JWT auth (HS256)

## Endpoints

| Path | Description |
|------|-------------|
| `GET /health` | Liveness check |
| `POST /auth/login` | Email + password login, returns JWT |
| `POST /auth/register` | Create new user |
| `GET /users/me` | Current user |
| `GET /users/search?q=…` | Search users by name or email |
| `GET /users/:id` | Get user by id |
| `GET /projects` | List active projects (paginated) |
| `POST /projects` | Create project |
| `GET /projects/:id` | Project + its tasks |
| `GET /tasks` | List tasks, filter by `project_id`, `status` |
| `POST /tasks` | Create task |
| `GET /tasks/:id` | Task detail with assignee info |
| `PATCH /tasks/:id` | Update task |
| `POST /payments/charge` | Charge premium subscription |
| `GET /payments` | List my payments |
| `POST /webhooks/inbound` | Inbound webhook receiver (Stripe-style) |
| `GET /webhooks/events` | Recent webhook events |
| `GET /admin/stats` | Admin dashboard metrics (admin only) |
| `GET /admin/users` | List all users (admin only) |
| `GET /reports/weekly?start=YYYY-Www&end=…` | Weekly task breakdown |
| `GET /reports/summary` | Counts of resources |

## Setup

```bash
cp .env.example .env
# edit .env and set SENTRY_DSN to your project's DSN
npm install
npm run seed
npm start
```

Server listens on `http://localhost:3000`. Default seeded credentials: `bob@taskforge.io` / `password123`.

## Triggering errors

To exercise every planted bug:

```bash
npm run trigger
```

Or trigger by severity / id:

```bash
node scripts/trigger-errors.js p0
node scripts/trigger-errors.js sql-injection
```

To generate background traffic:

```bash
npm run load              # default: 60s at 5 rps
DURATION_MS=300000 RPS=10 npm run load
```

## Environment variables

| Var | Default | |
|-----|---------|--|
| `SENTRY_DSN` | — | required to ship errors to Sentry |
| `SENTRY_ENVIRONMENT` | `development` | |
| `SENTRY_RELEASE` | `taskforge-api@1.4.2` | |
| `PORT` | `3000` | |
| `JWT_SECRET` | `dev-secret-change-me` | |
| `DATABASE_PATH` | `./data/taskforge.db` | |
