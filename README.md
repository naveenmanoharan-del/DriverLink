# Yukti Solutions

A staffing platform for the construction industry: a website backed by one REST API. Candidates
register with their CV; clients post their requirements; the team works both from the admin panel.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design, data model, API contract, and
local setup instructions.

```
backend/   NestJS + Drizzle + PostgreSQL — the shared REST API
web/       Next.js website
```

`_archive_legacy/` holds two earlier, unrelated prototypes this workspace previously contained (not
part of the running system — kept for reference rather than deleted).
