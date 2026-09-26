# Yukti Solutions — Architecture

A manpower supply platform connecting **clients** (people/companies who need workers) with **workers**
across every labour category: physical labour, drivers, artisans, and office staff. One backend serves
the website. (There was an Android app; it has been discontinued and removed.)

## System overview

```
                    ┌─────────────────┐
                    │   PostgreSQL     │
                    │  (users, jobs,   │
                    │  applications…)  │
                    └────────▲─────────┘
                             │ Drizzle ORM
                    ┌────────┴─────────┐
                    │   backend/        │
                    │  NestJS REST API  │
                    │  /api/v1/...      │
                    │  JWT auth + RBAC  │
                    └────────▲─────────┘
                             │ HTTPS/JSON
                    ┌────────┴─────────┐
                    │   web/            │
                    │  Next.js website  │
                    └──────────────────┘
```

## Why this stack

- **Backend — NestJS + Drizzle ORM + PostgreSQL.** NestJS gives a structured, testable module system
  (controller → service → DTO) that scales as more features (payments, notifications, admin tools) are
  added. Drizzle is a thin, type-safe SQL layer — the schema in `backend/src/database/schema.ts` is the
  single source of truth for the data model, and Drizzle Kit generates versioned SQL migrations from it.
- **Web — Next.js (App Router, TypeScript, Tailwind).** Server-capable React for a website with public
  pages (landing, job listings) alongside authenticated dashboards, and shared TypeScript types with a
  TypeScript backend.
- **Local infra — Docker Compose.** Postgres and Redis run in containers so the local setup matches what
  production will look like. Redis is provisioned for future use (rate limiting, job queues, caching) but
  nothing depends on it yet.

## Data model

Everything revolves around a **category taxonomy** (`categories` table) rather than hardcoded enums, so
new trades can be added by an admin later without a schema change. Categories are grouped into
`physical_labour`, `driver`, `artisan`, `office_staff`, `other` — seeded with ~24 starter categories
(General Labourer, Truck Driver, Electrician, Plumber, Data Entry Operator, etc. — see
`backend/scripts/seed.ts`).

| Table              | Purpose                                                                 |
|---------------------|--------------------------------------------------------------------------|
| `users`             | Login identity: phone, password hash, `role` (`worker`/`client`/`admin`) |
| `worker_profiles`    | A worker's trade, skills, rate, availability, rating — 1:1 with a user   |
| `client_profiles`    | A hirer's name/company, type (individual/company) — 1:1 with a user     |
| `jobs`               | A posting from a client: category, location, rate, schedule, status     |
| `job_applications`   | Historical only: candidates' applications from when they could browse jobs |
| `reviews`            | Historical only: post-job ratings from the retired reviews feature        |

A job is a client's **requirement**, seen only by that client and by admins; candidates no longer browse
or apply to jobs, and there is no reviews API. `jobs.status` moves `open → assigned → in_progress →
completed` (or `cancelled`). The two historical tables are kept so old rows stay intact.

## Authentication — two account types, one login

There is a single `users` table with a `role` column, not two parallel auth systems:

- `POST /v1/auth/register/worker` — creates a `users` row with `role=worker` **and** a `worker_profiles`
  row in one transaction.
- `POST /v1/auth/register/client` — same, but `role=client` + `client_profiles`.
- `POST /v1/auth/login` — phone + password, returns a JWT access token (15 min) and refresh token (7
  days). The JWT payload carries `{ sub: userId, role }`.
- `POST /v1/auth/refresh` — exchanges a valid refresh token for a new session, revoking the one used.
- `POST /v1/auth/logout` — revokes a refresh token server-side. Unauthenticated and idempotent.
- `GET /v1/auth/me` — returns the current user + their role-specific profile.

Every protected route is guarded by `JwtAuthGuard` (validates the token) and, where the action is
role-specific, `RolesGuard` + `@Roles('worker' | 'client' | 'admin')` (e.g. only a `client` can `POST
/v1/jobs` or read one). This was verified directly: a worker token gets `403` on
`POST /v1/jobs`, and an unauthenticated request gets `401` on `GET /v1/workers/me`.

## API surface (v1)

```
GET    /v1/categories                          list labour categories (public)

POST   /v1/auth/register/worker
POST   /v1/auth/register/client
POST   /v1/auth/login
POST   /v1/auth/refresh
POST   /v1/auth/logout
GET    /v1/auth/me                              [auth]

GET    /v1/workers                              browse/search workers (public)
GET    /v1/workers/:id                          public worker profile
GET    /v1/workers/me                           [worker]
PUT    /v1/workers/me                           [worker]

GET    /v1/clients/me                           [client]
PUT    /v1/clients/me                           [client]

POST   /v1/jobs                                 [client] post a requirement
GET    /v1/jobs/mine                            [client] own postings
GET    /v1/jobs/:id                              [client, owner only]
PATCH  /v1/jobs/:id/status                       [client, owner only]

POST   /v1/auth/change-password                   [auth] ends other sessions
PUT    /v1/workers/me/resume                      [worker] multipart `resume`
GET    /v1/workers/me/resume(/file)               [worker] metadata / download

GET    /v1/admin/stats?days=                      [admin] dashboard figures
GET    /v1/admin/candidates?q&group&…             [admin] search + filters
GET    /v1/admin/candidates/export                [admin] CSV (same filters)
GET    /v1/admin/candidates/:id(/resume)          [admin] detail / resume file
PATCH  /v1/admin/candidates/:id                   [admin] pipeline, verification, notes
GET    /v1/admin/clients(/:id)                    [admin]
PATCH  /v1/admin/users/:userId/active             [admin] (de)activate any account
DELETE /v1/admin/users/:userId                    [admin] permanent delete
GET|POST /v1/admin/placements, PATCH|DELETE /:id  [admin]
GET|POST /v1/admin/admins, GET /v1/admin/audit     [admin]
```

`GET /v1/workers` and `/v1/workers/:id` require a client or admin login: they
list personal data. Admin-only fields (`adminNotes`, `pipelineStatus`) are
stripped from every non-admin response by `workers/public-profile.ts`.

## Repository layout

```
DriverLink/
├── backend/          NestJS API — the single source of truth
│   ├── src/
│   │   ├── auth/            registration, login, JWT strategy
│   │   ├── categories/      labour taxonomy
│   │   ├── workers/         worker profile CRUD + search
│   │   ├── clients/         client profile CRUD
│   │   ├── jobs/             client job requirements
│   │   ├── database/         Drizzle schema + connection
│   │   └── common/           JWT/roles guards, decorators
│   ├── drizzle/              generated SQL migrations
│   ├── scripts/seed.ts       seeds the category taxonomy
│   └── Dockerfile
├── web/               Next.js website (App Router, Tailwind)
│   ├── app/                  routes: /, /login, /register/*, /worker/*, /client/*
│   ├── components/           NavBar, RequireRole guard
│   └── lib/                  API client, auth context, shared types
├── docker-compose.yml  Postgres + Redis (+ optional containerized backend)
└── _archive_legacy/    the previous Laravel/trucking-domain prototype (kept, not deleted)
```

`_archive_legacy/` holds the two earlier, unrelated prototypes this workspace previously contained (a
Laravel trucking-dispatch app and an early NestJS skeleton) — preserved rather than deleted since this is
not a git-tracked history. They are not part of the running system.

## Running it locally

```bash
# 1. Start Postgres + Redis
docker compose up -d postgres redis

# 2. Backend
cd backend
cp .env.example .env      # DATABASE_URL already points at localhost:5433
npm install
npm run db:migrate        # applies drizzle/ SQL migrations
npm run db:seed           # seeds the 24 starter categories
npm run start:dev         # http://localhost:3000/api

# 3. Website
cd ../web
npm install
npm run dev                # http://localhost:3000 by default; use -p to change port
                            # reads NEXT_PUBLIC_API_URL from .env.local
```

Postgres is published on host port **5433** (not 5432) because this machine already had a native
PostgreSQL service bound to 5432; `backend/.env` and `docker-compose.yml` are already wired for 5433.

## Sessions and revocation

Access tokens last ~15 minutes; refresh tokens last 7 days. The website transparently
refresh-and-retries on a 401 (`web/lib/api.ts`), collapsing
concurrent refreshes onto one request so a screen firing several calls at once doesn't trip the auth
rate limit.

Because a refresh token is long-lived, it is not merely a signed JWT — every issued one is recorded in
`refresh_tokens` so a session can actually be ended server-side:

- Only a **SHA-256 of the token** is stored, so a database leak yields nothing replayable. A plain hash
  (not bcrypt) is correct here: the token is already long and random, so there's nothing to brute-force.
- **Refreshing rotates.** The token just used is revoked as part of the exchange, so replaying it fails.
- **Logout revokes.** `POST /v1/auth/logout` is unauthenticated by design — the access token has usually
  expired by the time someone logs out, and the refresh token is itself the credential being surrendered.
  It is idempotent and gives the same answer for unknown tokens, so it can't be used to probe validity.
- Revoked rows are **kept, not deleted**, so a replayed token reads as revoked rather than unknown.

Each refresh token carries a `jti`. Without it, two tokens minted for the same user within the same
second are byte-identical — JWT `iat` only has one-second resolution — and collide on the stored hash.
Logging in immediately after registering hits exactly that case.

## Testing

```bash
cd backend && npm run test:api        # end-to-end checks against a running server
cd backend && ADMIN_PHONE=… ADMIN_PASSWORD=… npm run test:admin   # registration limits,
                                      # resume handling, privacy, admin API
cd web     && npm run build           # type-checks as part of the build
cd web     && npm run check:contrast  # WCAG AA gate on the design tokens
```

`backend/test/api-e2e.mjs` is the main safety net. It drives a **running** server over HTTP rather than
mocking, so it covers the wiring (guards, pipes, throttler, DB) that unit tests would stub out. It walks
registration → login → a client's job requirement (and asserts job browsing, applying and reviews are
gone), then checks the areas that have actually broken before:

- **Token refresh.** Access tokens last ~15 minutes and the website refresh-and-retries on a 401. If this
  regresses, every logged-in user is locked out a quarter-hour after signing in — with no visible cause.
- **Malformed path params.** A non-UUID id used to reach the driver and surface as a 500; these must be
  400s.
- **Rate limiting.** Runs last, because it deliberately trips the login limiter for the rest of the window.

Point it at another environment with `API_URL=https://host/api npm run test:api`. It creates real records
under timestamped phone numbers, so run it against a disposable database, never production.

`npx eslint .` in `web/` currently reports 6 errors, all the same React 19 rule
(`react-hooks/set-state-in-effect`) on two deliberate patterns: hydrating the session from
`localStorage` on mount, and the `setLoading(true)` that starts each list fetch. Both are correct and
work; the rule's actual remedy is to stop fetching in effects altogether (server components or a data
library), which is a larger change than it's worth right now. They are known, not overlooked — but don't
let genuinely new lint errors hide behind that count.

`web/scripts/check-contrast.mjs` guards the palette. The accent and teal were darkened specifically so
white button text clears 4.5:1. The palette now comes from the brand kit (`web/app/brand.css`), and the
script hard-codes the token values, so **it must be updated alongside `web/app/brand.css`**; nothing else
keeps them in sync.

## What's deliberately out of scope for v1

These are natural next additions, not oversights:

- **Payments / escrow** — no wallet debit/credit logic yet, though `client_profiles.walletBalance` exists
  as a placeholder in the original schema exploration.
- **Category management UI** — the admin panel (`/admin`) covers candidates, clients, placements and
  admins, but the list of positions is still edited in `backend/src/database/categories.seed.ts`.

## Rate limiting

The API is protected by `@nestjs/throttler`, applied globally via `APP_GUARD` in `app.module.ts`:

- **Global default** — every route gets `RATE_LIMIT_LIMIT` requests per `RATE_LIMIT_TTL_MS` per client IP
  (env-configurable, defaults to 60 requests/minute). Set in `backend/.env`.
- **Auth endpoints get tighter, hardcoded limits** (`@Throttle` overrides in `auth.controller.ts`), since
  they're the highest-value abuse targets:
  - `POST /v1/auth/register/worker` and `/register/client` — 5 requests/minute (spam accounts are cheap
    to create and write real DB rows).
  - `POST /v1/auth/login` and `/refresh` — 10 requests/minute (blunts credential stuffing / brute force
    while tolerating a few genuine mistyped-password retries).
  - A request over the limit gets `429 Too Many Requests`. Verified locally: the 11th login attempt
    within a minute from the same IP returns 429 while unrelated endpoints (e.g. `/v1/categories`)
    keep responding normally, since each route's limit is tracked in its own bucket.

Throttling is keyed off `req.ip`, which is why **`trust proxy` is set in `main.ts`** — any deployment
sitting behind a reverse proxy or load balancer (Nginx, Lightsail's own load balancer, CloudFront) forwards
the real client IP via `X-Forwarded-For`; without `trust proxy`, every request would appear to come from
the proxy's IP and share one throttle bucket, either locking out all real users at once or (with a naive
`trust proxy: true`) letting a client spoof `X-Forwarded-For` to bypass the limit entirely. `trust proxy: 1`
trusts exactly one hop, matching a single reverse proxy in front of the app.

State is kept in-memory per Node process, which is correct for a single Lightsail instance. If this ever
scales to multiple instances behind a load balancer, the throttle storage would need to move to something
shared (e.g. the Redis instance already provisioned in `docker-compose.yml`, via a Redis-backed
`ThrottlerStorage` implementation) — otherwise each instance enforces the limit independently, silently
multiplying the effective limit by the instance count.

## Path to the cloud

The local setup mirrors the intended production shape closely on purpose:

1. Push `backend/` to a container registry, deploy behind HTTPS (e.g. a managed Postgres + a container
   host). `backend/Dockerfile` already builds a runnable image.
2. Point `web/.env.local`'s `NEXT_PUBLIC_API_URL` at the deployed API URL instead of localhost.
3. Deploy `web/` (e.g. to any Node hosting).

No architectural changes are needed to move from "local Docker Compose" to "cloud" — only environment
configuration.

### AWS Lightsail specifics

- **Put Nginx (or Lightsail's load balancer) in front of the Node process for TLS termination** — Lightsail
  instances don't terminate HTTPS for you. Either attach a Lightsail Load Balancer (which also gives you a
  managed cert) in front of the instance, or run Nginx + Certbot on the instance itself, reverse-proxying to
  the Nest app on `PORT`. Either way, the proxy forwards `X-Forwarded-For`, and `trust proxy: 1` (already
  set) makes the app trust exactly that one hop for rate-limiting and logging purposes.
- **Lightsail's networking tab is a firewall (allow/deny by port), not a rate limiter** — it can restrict
  which ports are reachable at all (e.g. only 80/443 from the internet, Postgres port not exposed
  externally), but the actual request-rate limiting is the application-level throttling described above.
- **Postgres**: for a single small instance, running Postgres in the same Docker Compose stack as the app
  is fine; for anything beyond a nano/micro instance, prefer a managed database (e.g. Lightsail's managed
  PostgreSQL) so the app instance isn't also carrying DB I/O and backups.
- Bump `RATE_LIMIT_LIMIT` / `RATE_LIMIT_TTL_MS` in the instance's `.env` if the default 60 req/min turns
  out too tight for real traffic patterns — it's a starting point sized for a small instance, not a
  measured production number.
