# Yukti Solutions

A manpower supply platform: a website and an Android app, sharing one backend, connecting **clients**
(who need workers) with **workers** across physical labour, drivers, artisans, and office staff.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design, data model, API contract, and
local setup instructions.

```
backend/   NestJS + Drizzle + PostgreSQL — the shared REST API
web/       Next.js website
mobile/    Flutter Android app
```

`_archive_legacy/` holds two earlier, unrelated prototypes this workspace previously contained (not
part of the running system — kept for reference rather than deleted).
