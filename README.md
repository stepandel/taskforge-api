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

### Web console

Open `http://localhost:3000/` (or your Fly URL) — the root redirects to a built-in test console at `/_test/` with one button per planted bug, severity-grouped, plus "fire all P0/P1/…" shortcuts and a live activity log. The page auto-logs in as both seeded users so admin-only triggers work without setup.

### CLI

```bash
npm run trigger                            # fire every bug
node scripts/trigger-errors.js p0          # only P0 bugs
node scripts/trigger-errors.js sql-injection
BASE_URL=https://taskforge-api.fly.dev npm run trigger
```

### Background traffic

```bash
npm run load                               # default: 60s at 5 rps
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

The repo ships with a `Dockerfile`, `fly.toml`, and a GitHub Actions workflow at
`.github/workflows/deploy.yml` that runs `flyctl deploy` on every push to `main`.

### One-time setup

1. **Push to GitHub** (any repo, public or private).
2. **Install flyctl locally** and sign in:
   ```bash
   brew install flyctl   # or: curl -L https://fly.io/install.sh | sh
   flyctl auth signup    # or: flyctl auth login
   ```
3. **Create the Fly app** (matches the name in `fly.toml`; pick a unique name and edit if needed):
   ```bash
   flyctl apps create taskforge-api
   ```
4. **Create the persistent volume** for SQLite:
   ```bash
   flyctl volumes create taskforge_data --size 1 --region sjc
   ```
5. **Set runtime secrets** on Fly (these are not in fly.toml — they live in Fly's secret store):
   ```bash
   flyctl secrets set \
     SENTRY_DSN="https://<your-key>@oXXXX.ingest.sentry.io/YYYY" \
     JWT_SECRET="$(openssl rand -hex 32)"
   ```
6. **Generate a deploy token and add it to GitHub**:
   ```bash
   flyctl tokens create deploy
   ```
   In your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
   - **Name:** `FLY_API_TOKEN`
   - **Value:** the token from the previous command

### Every push to `main`

The Actions workflow runs `flyctl deploy --remote-only`, which:
- builds the Dockerfile in Fly's remote builder
- runs `node src/seed.js` as the release command (idempotent — safe to re-run)
- rolls out the new machine with the volume re-attached

### Triggering bugs against the deployed app

Once deployed, point the trigger script at your Fly URL:

```bash
BASE_URL=https://taskforge-api.fly.dev npm run trigger
BASE_URL=https://taskforge-api.fly.dev npm run load
```

Sentry events from the Fly machine will arrive in the Sentry project tied to
the `SENTRY_DSN` secret, tagged `environment=production`.

### Cost note

`fly.toml` sets `auto_stop_machines = "stop"` and `min_machines_running = 0`,
so the machine sleeps when idle and wakes on the first request. With the
`shared-cpu-1x / 256mb` VM and a 1 GB volume, this stays inside Fly's free
allowance for typical test traffic.
