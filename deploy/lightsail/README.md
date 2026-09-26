# Deploying on AWS Lightsail

One Lightsail server runs both apps behind nginx, and a Lightsail managed
PostgreSQL database holds the data. Everything is in Mumbai (`ap-south-1`).

| Piece | Lightsail resource | Cost |
|---|---|---|
| Website + API | Instance, Ubuntu 24.04, 2 GB plan | $12/month |
| PostgreSQL | Managed database, Standard 1 GB plan | $15/month |
| Public IP | Static IP (free while attached) | $0 |

**$27/month.** The database plan includes automatic daily backups. The server
holds no data of its own (resumes live in the database), so it doesn't need
snapshots.

```
browser ──https──> nginx :443 ──/api/*──> NestJS  127.0.0.1:3000 ──TLS──> Lightsail Postgres
                              └──/*─────> Next.js 127.0.0.1:3001
```

Both apps are served from one domain, so the site calls `https://<domain>/api`
and the API only accepts requests from that origin.

The steps are in order. In particular, **move the data (step 5) before the
first deploy (step 6)**: the deploy creates empty tables, and the restore would
then collide with them.

## 1. Create the database

Lightsail console → **Databases** → **Create database**:

- Region: **Mumbai (ap-south-1)**
- Engine: **PostgreSQL**, the newest version offered
- Plan: **Standard, $15** (1 GB)
- Name: `yukti-db`. Under *Specify login credentials*, keep user
  `dbmasteruser`. Under *Specify the master database name*, enter `yukti`.

Leave **Public mode off**. The instance reaches the database over Lightsail's
private network, so it never needs to be exposed to the internet.

When it's ready, **Connection details** shows the endpoint and password.

## 2. Create the server

Lightsail console → **Instances** → **Create instance**:

- Region: **Mumbai (ap-south-1)**, the same region as the database
- Platform **Linux/Unix**, blueprint **OS Only → Ubuntu 24.04 LTS**
- Plan: **$12** (2 GB). The 1 GB plan runs out of memory building the website.
- Name: `yukti-server`

Then, on the instance:

- **Networking** → **Create static IP** and attach it. DNS will point at this
  address.
- **Networking** → **IPv4 Firewall** → add a rule for **HTTPS (443)**. SSH (22)
  and HTTP (80) are open by default.

## 3. Set up the server

Click **Connect using SSH** on the instance (a terminal opens in the browser),
then:

```bash
curl -fsSL https://raw.githubusercontent.com/naveenmanoharan-del/DriverLink/main/deploy/lightsail/setup.sh -o setup.sh
DOMAIN=yuktisolutions.co.in bash setup.sh
```

If the repository is private, that URL returns 404. Upload `setup.sh` through the
SSH window's upload button instead, then run the second line.

Partway through, the script prints an SSH key and waits. Add it on GitHub under
**repo → Settings → Deploy keys → Add deploy key**, read-only, then press
Enter.

## 4. Fill in the API settings

```bash
nano ~/DriverLink/backend/.env
```

The script has already set the domain and generated the JWT secrets. Fill in:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://dbmasteruser:<password>@<endpoint>:5432/yukti` from step 1. Don't append `?sslmode=require`. |
| `RESEND_API_KEY` | the same key Render uses |
| `ADMIN_PHONE` / `ADMIN_PASSWORD` | the same values as on Render, so the admin login doesn't change |

`DATABASE_CA_CERT_FILE=certs/rds-global-bundle.pem` is already set. Lightsail
databases use Amazon RDS certificates, which aren't in Node's default trust
store, so the bundled file keeps certificate checking on.

## 5. Move the data off Supabase

Run this on the server. It can reach both Supabase and the private Lightsail
database. Use Supabase's **session pooler** URI (port 5432, see `DEPLOY.md`).

```bash
cd ~/DriverLink/backend
SUPABASE_URL='postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres?sslmode=require'
LIGHTSAIL_URL="$(grep ^DATABASE_URL= .env | cut -d= -f2-)?sslmode=verify-full&sslrootcert=certs/rds-global-bundle.pem"

# Only the app's tables (public) and the migration history (drizzle); Supabase's
# own schemas (auth, storage, ...) stay behind.
pg_dump "$SUPABASE_URL" -n public -n drizzle --no-owner --no-privileges -Fc -f ~/yukti.dump
pg_restore -d "$LIGHTSAIL_URL" --no-owner --no-privileges ~/yukti.dump

psql "$LIGHTSAIL_URL" -c 'select count(*) from users'   # should match Supabase
```

Messages about the `public` schema already existing are expected and harmless.

To start with an empty database instead, skip this step. The deploy creates
the tables and the first admin.

## 6. Build and start

```bash
bash ~/DriverLink/deploy/lightsail/deploy.sh
```

It ends with `API healthy` and `Website up`. Before touching DNS, check it from
your own machine:

```bash
curl http://<static-ip>/api/health
```

## 7. Point the domain at the server

At the DNS provider for `yuktisolutions.co.in` (Google/Squarespace):

| Type | Host | Old value | New value |
|---|---|---|---|
| A | `@` | `216.24.57.1` (Render) | `<static-ip>` |
| CNAME → A | `www` | `yukti-web.onrender.com` | delete the CNAME; add **A** `www` → `<static-ip>` |

**Don't touch the MX and SPF TXT records.** They carry company email on Google
Workspace.

## 8. Turn on HTTPS

Once `yuktisolutions.co.in` resolves to the static IP (check with
`nslookup yuktisolutions.co.in`):

```bash
sudo certbot --nginx -d yuktisolutions.co.in -d www.yuktisolutions.co.in
```

Certbot installs the certificate, adds an HTTP→HTTPS redirect, and sets up
automatic renewal.

## 9. After the cut-over

- **Render:** once the new site has run cleanly for a few days, delete both
  Render services and `.github/workflows/keep-warm.yml`. Nothing sleeps any
  more, so the pings aren't needed.
- **Supabase:** keep it untouched for a week or two as a fallback, then delete
  the project.

## Deploying updates

Push to `main`, then on the server:

```bash
bash ~/DriverLink/deploy/lightsail/deploy.sh
```

It pulls, installs, builds, migrates and restarts. The site is unavailable for a
minute or two while it builds.

## Day to day

| Task | Command |
|---|---|
| Status | `pm2 status` |
| Logs | `pm2 logs api` / `pm2 logs web` |
| Restart | `pm2 restart all` |
| Edit API settings | `nano ~/DriverLink/backend/.env`, then `pm2 restart api --update-env` |
| Change the API URL the site uses | edit `web/.env.production`, then run `deploy.sh`. The URL is baked in at build time. |

pm2 restarts a crashed app and brings both apps back after a server reboot.
