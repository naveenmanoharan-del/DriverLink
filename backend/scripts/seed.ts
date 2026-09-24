import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/database/schema';
import { sslFor } from '../src/database/ssl';
import { CATEGORY_SEED, seedCategories } from '../src/database/categories.seed';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  // Same TLS rules as the app, so seeding a hosted database works too.
  const pool = new Pool({ connectionString, ...sslFor(connectionString) });
  const db = drizzle(pool, { schema });

  await seedCategories(db);

  console.log(`Seeded ${CATEGORY_SEED.length} categories.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
