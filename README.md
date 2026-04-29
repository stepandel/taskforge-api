# TaskForge API

A small task-and-project management HTTP API built on Express and SQLite, instrumented with Sentry for error reporting and performance monitoring.

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
| `POST /webhooks/inbound` | Inbound webhook receiver |
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

Server listens on `http://localhost:3000`. Default seeded credentials: `bob@taskforge.io` / `password123`. To generate background traffic for benchmarking:

```bash
npm run load              # 60s at 5 rps
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

## Deploying to Fly.io via GitHub

The repo ships with a `Dockerfile`, `fly.toml`, and a GitHub Actions workflow at `.github/workflows/deploy.yml` that runs `flyctl deploy` on every push to `main` or `master`.

### One-time setup

1. Push the repo to GitHub.
2. Install flyctl and sign in:
   ```bash
   brew install flyctl
   flyctl auth login
   ```
3. Create the Fly app (matches the name in `fly.toml`; pick a unique name and edit if needed):
   ```bash
   flyctl apps create taskforge-api
   ```
4. Create the persistent volume for SQLite:
   ```bash
   flyctl volumes create taskforge_data --size 1 --region sjc
   ```
5. Set runtime secrets on Fly:
   ```bash
   flyctl secrets set \
     SENTRY_DSN="https://<your-key>@oXXXX.ingest.sentry.io/YYYY" \
     JWT_SECRET="$(openssl rand -hex 32)"
   ```
6. Generate a deploy token and add it to GitHub:
   ```bash
   flyctl tokens create deploy
   ```
   GitHub → Settings → Secrets and variables → Actions → New repository secret. Name: `FLY_API_TOKEN`.

After that, every push to the default branch deploys.
