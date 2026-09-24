import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './schema';
import { sslFor } from './ssl';
import { seedCategories } from './categories.seed';
import { bootstrapAdmin } from './bootstrap-admin';

/**
 * Runs before the API starts (see `start:prod`), so a deploy brings the
 * database up to date on its own — Render's free plan has no pre-deploy hook,
 * and a new column the code expects but the database lacks is a 500 on every
 * request.
 *
 * Migrations and the seed run as separate steps on purpose: the migrator wraps
 * all pending migrations in one transaction, and Postgres refuses to use an
 * enum value added in the same transaction that adds it.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const pool = new Pool({ connectionString, ...sslFor(connectionString) });
  const db = drizzle(pool, { schema });
  try {
    await migrate(db, { migrationsFolder: 'drizzle' });
    await seedCategories(db);
    await bootstrapAdmin(db);
    console.log('Database migrated and categories seeded.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
