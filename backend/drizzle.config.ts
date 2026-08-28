import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { sslFor } from './src/database/ssl';

const url = process.env.DATABASE_URL!;

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  // Same TLS rules as the app, so `db:migrate` cannot succeed locally and then
  // fail against a hosted database (or vice versa).
  dbCredentials: { url, ...sslFor(url) },
});
