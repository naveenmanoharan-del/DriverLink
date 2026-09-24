# Deploying for free

## Live deployment

| | |
|---|---|
| Website | https://yukti-web.onrender.com |
| API | https://yukti-api-3hdc.onrender.com/api |
| Database | Supabase project `kojrjxjdndusvgnweqak` (ap-southeast-2) |

Verified with `API_URL=https://yukti-api-3hdc.onrender.com/api npm run test:api` — 84/84.

Note the API's hostname carries a `-3hdc` suffix: Render appends one when the
service name is already taken globally, so read the real URL off the dashboard
rather than assuming `<name>.onrender.com`.

### Migrations run on every deploy

`npm run start:prod` runs `dist/src/database/migrate.js` before the API
starts: it applies any pending `drizzle/` migrations and re-seeds the category
list from `src/database/categories.seed.ts`. Categories not in that file are
deactivated (hidden from forms, kept for old profiles). To change the roles on
offer, edit that file and deploy — nothing needs running by hand.

### The admin panel

`/admin` is the owner's back office: a dashboard of registrations, departments,
pipeline and placements; searchable candidate lists with resume preview, notes,
status and CSV export; clients; placements; an activity log of every admin
change; and admin/password settings.

The first admin is created from two environment variables on `yukti-api`:

| Variable | Value |
|---|---|
| `ADMIN_PHONE` | the phone number you'll log in with, e.g. `+919876543210` (must not already belong to a candidate or client) |
| `ADMIN_PASSWORD` | 8–72 characters |

On the next deploy the migrate step creates the account (the log says `Admin
account created`). Log in at `/login` and you land on `/admin`. Add further admins
from **Admin → Settings**. Forgotten password: set `ADMIN_RESET_PASSWORD=true`
with a new `ADMIN_PASSWORD`, redeploy, log in, then delete `ADMIN_RESET_PASSWORD`.

Deactivating an account signs it out everywhere immediately (every request
re-checks the account). Deleting is permanent; placement records keep the
person's name so the statistics survive.

### Email notifications

Every new account (candidate or client) and every resume upload emails
`ADMIN_NOTIFY_EMAIL`, with the resume attached. Sending goes through Resend's
HTTP API because Render's free plan blocks outbound SMTP. Set
`RESEND_API_KEY` on `yukti-api`. If it is missing, registration still works and
the API logs `Email not configured`.

Resumes are stored in Postgres (`resumes` table, 5 MB cap, PDF/DOC/DOCX checked
by file signature). Supabase's free database is 500 MB, which is roughly a few
thousand CVs; move them to object storage before that becomes tight.

### Cold starts and the keep-warm job

Free Render instances sleep after 15 minutes idle and take 30–50s to answer the
next request. `.github/workflows/keep-warm.yml` pings both services every 14
minutes to prevent that — but only for an 11-hour daily window, because two
separate free-tier limits make 24/7 pinging self-defeating:

| Limit | Allowance | Cost of pinging 24/7 |
|---|---|---|
| Render instance-hours (whole workspace) | 750/month | ~1460 — runs out mid-month |
| GitHub Actions minutes (private repo) | 2000/month | ~3648 — each run bills ≥1 minute |

An 11-hour window costs ~669 instance-hours and ~1672 Actions minutes, so both
fit with headroom. Outside the window the site still works; the first visitor
just pays the cold start. `workflow_dispatch` lets you warm it manually before a
demo.

**Before widening the window, redo the arithmetic:** `hours/day × 2 services ×
30.4` must stay under 750, and `5 × hours/day × 30.4` under 2000.

Two caveats worth knowing:

- GitHub delays scheduled workflows under load, so a ping can land late and a
  service may occasionally sleep anyway. It is best-effort, not a guarantee.
- GitHub disables scheduled workflows in a repository with no commits for 60
  days. If pings stop, that is the first thing to check.

The job also doubles as uptime monitoring: it fails, and notifies you, when a
service returns anything other than 200.

`/api/health` runs `select 1` against the database. That matters twice over:
a check that only proves the Node process is up stayed green while every real
request was failing, and Supabase's free tier **pauses a project after a week
without database activity** — the likely cause of the API returning 500s in September
2026. The keep-warm pings now count as that activity.

### Custom domain — do not break email

`yuktisolutions.co.in` is registered through Google/Squarespace and **runs Google
Workspace email**:

```
MX  -> smtp.google.com
TXT -> v=spf1 include:_spf.google.com ~all
```

Only the web records change. Leaving MX or that SPF record out when editing DNS
takes company email down with it.

| Type | Host | Value |
|---|---|---|
| A | `@` | `216.24.57.1` (replaces the four Squarespace A records) |
| CNAME | `www` | `yukti-web.onrender.com` |

Render issues the TLS certificate automatically once the records resolve.


The platform is three pieces. Only two of them need a host:

| Piece | Where | Why |
|---|---|---|
| PostgreSQL | **Supabase** | free, and data is not deleted when limits are hit |
| NestJS API | **Render** | free Node service |
| Next.js website | **Render** | free Node service |
| Android app | nowhere | it's an APK you hand out; it just needs the API URL |

Redis is not required — nothing in the codebase reads it.

**Supabase does not host websites.** It is a database/auth/storage backend; there is
no frontend hosting for Next.js. Likewise GitHub Pages serves static files only and
cannot run the API, the database, or the one server-rendered route. Both were tried;
neither can host this app.

---

## 1. Supabase — the database

1. Create a project. Save the database password it shows you (it is not shown again).
2. **Connect** → **Direct connection** tab → choose **Session pooler** (port **5432**).

   Three traps here, all of which were hit while setting this up:

   - **Not the transaction pooler (port 6543).** It runs pgBouncer in
     transaction mode, which breaks DDL and prepared statements, so
     `npm run db:migrate` fails against it.
   - **Not "Direct connection" either, on most hosts.** It is IPv6-only unless
     you buy the IPv4 add-on, and Render's free tier is IPv4. The session
     pooler is IPv4 and still session-mode, so migrations work.
   - **Do not append `?sslmode=require`.** Current `pg` treats `require` as an
     alias for `verify-full` and lets it override the TLS options the app
     builds, which breaks the connection. TLS is enabled automatically.

3. Create the tables. From `backend/`, with that URI:

   ```bash
   DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres?sslmode=require" npm run db:migrate
   DATABASE_URL="..." npm run db:seed     # loads the ~24 labour categories
   ```

   The seed matters: without categories, registration and job posting have
   nothing to select and both forms are unusable.

TLS is enabled automatically for any non-localhost host, and **certificate
verification stays on**. Supabase serves databases from its own CA, which isn't
in Node's trust store, so the bundled copy is used:

```
DATABASE_CA_CERT_FILE=certs/supabase-prod-ca-2021.crt
```

Set that alongside `DATABASE_URL` wherever the API runs. Without it you'd get
`self-signed certificate in certificate chain` — the fix is to supply the CA,
not to disable verification.

## 2. Render — API and website

1. **New → Blueprint**, pick this repository. `render.yaml` defines both services.
2. Render will ask for the values marked `sync: false`:

   | Service | Variable | Value |
   |---|---|---|
   | `yukti-api` | `DATABASE_URL` | the Supabase URI from step 1 |
   | `yukti-api` | `CORS_ORIGIN` | *(leave blank on first deploy)* |
   | `yukti-web` | `NEXT_PUBLIC_API_URL` | *(leave blank on first deploy)* |

   The JWT secrets are generated by Render, so no real secret is ever committed.

3. After the first deploy you know both URLs. Set the two blanks and redeploy:

   - `yukti-api` → `CORS_ORIGIN` = `https://yukti-web.onrender.com`
   - `yukti-web` → `NEXT_PUBLIC_API_URL` = `https://yukti-api.onrender.com/api`

   `NEXT_PUBLIC_API_URL` is baked into the client bundle at build time, so the
   web service must be **redeployed**, not just restarted.

4. Check it: `https://yukti-api.onrender.com/api/health` should return 200, and
   `https://yukti-api.onrender.com/api/v1/categories` should list the categories.

**Free plan behaviour:** services sleep after 15 minutes idle and take roughly
30–50 seconds to answer the first request afterwards. Fine for testing and
demos; not what you want in front of a client cold.

## 3. Android app

Point it at the hosted API at build time:

```bash
flutter build apk --release \
  --dart-define=API_BASE_URL=https://yukti-api.onrender.com/api
```

Release builds refuse cleartext HTTP, so the API must be HTTPS — Render provides
that. Debug builds keep using `http://10.0.2.2:3000/api` for the emulator.

## Verifying a deployment

```bash
API_URL=https://yukti-api.onrender.com/api npm run test:api
```

Runs all 84 checks against the deployed server. It creates real accounts and
jobs under timestamped phone numbers, so point it at a disposable database —
never at production data you care about.

## Custom domain

`yuktisolutions.co.in` currently serves the Squarespace site. Do not repoint it —
add a subdomain instead (`app.` / `api.`) so the existing site is untouched.
