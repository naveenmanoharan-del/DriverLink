/**
 * Decides whether a Postgres connection needs TLS.
 *
 * Hosted Postgres (Supabase, Neon, RDS…) requires it; the local Docker
 * container doesn't offer it. node-postgres does not act on `sslmode` in the
 * connection string by itself, so the decision has to be made explicitly.
 *
 * Shared by the Nest app and the standalone seed script so a deployment can't
 * work in one and fail in the other.
 */
export function sslFor(connectionString: string) {
  const wantsSsl =
    /[?&]sslmode=(require|verify-ca|verify-full)/.test(connectionString) ||
    !/@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

  return wantsSsl ? { ssl: { rejectUnauthorized: true } } : {};
}
