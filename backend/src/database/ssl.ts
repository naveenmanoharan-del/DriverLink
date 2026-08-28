import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Builds the TLS options for a Postgres connection.
 *
 * Hosted Postgres requires TLS; the local Docker container doesn't offer it.
 * node-postgres does not act on `sslmode` in the connection string by itself,
 * so the decision is made here and passed explicitly.
 *
 * Certificate verification is kept ON. Supabase serves its databases from a
 * private CA ("Supabase Root 2021 CA") that isn't in Node's trust store, so
 * verification fails against it unless that CA is supplied — the fix is to
 * supply the CA, not to stop verifying. Point `DATABASE_CA_CERT_FILE` at
 * `certs/supabase-prod-ca-2021.crt` (bundled) or paste the PEM into
 * `DATABASE_CA_CERT`.
 *
 * A note on the connection string: do **not** put `?sslmode=require` in
 * DATABASE_URL. Current pg treats `require` as an alias for `verify-full` and
 * lets it override the options built here, which reintroduces the very
 * verification failure this function exists to solve.
 */
export function sslFor(connectionString: string) {
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  const wantsSsl =
    /[?&]sslmode=(require|verify-ca|verify-full)/.test(connectionString) ||
    !isLocal;

  if (!wantsSsl) return {};

  const ca = loadCa();
  if (ca) return { ssl: { ca, rejectUnauthorized: true } };

  // No CA supplied: still verify, against the system trust store. That is
  // correct for providers with a publicly-trusted certificate (Neon, RDS) and
  // will fail loudly for one with a private CA rather than silently accepting
  // any certificate.
  return { ssl: { rejectUnauthorized: true } };
}

function loadCa(): string | undefined {
  const inline = process.env.DATABASE_CA_CERT?.trim();
  if (inline) return inline;

  const file = process.env.DATABASE_CA_CERT_FILE?.trim();
  if (!file) return undefined;

  // Resolved from the backend package root so the same value works whether the
  // process is started from source or from dist/.
  return readFileSync(resolve(process.cwd(), file), 'utf8');
}
