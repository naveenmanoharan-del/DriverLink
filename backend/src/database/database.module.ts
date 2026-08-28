import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DATABASE = Symbol('DATABASE');
export type Database = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Database => {
        const connectionString = config.getOrThrow<string>('DATABASE_URL');

        // Hosted Postgres (Supabase, Neon, RDS…) requires TLS, while the local
        // Docker container doesn't offer it. node-postgres does not act on
        // `sslmode` in the URL on its own, so decide here: enable TLS whenever
        // the URL asks for it or points somewhere other than this machine.
        const wantsSsl =
          /[?&]sslmode=(require|verify-ca|verify-full)/.test(connectionString) ||
          !/@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

        return drizzle(
          new Pool({
            connectionString,
            ...(wantsSsl ? { ssl: { rejectUnauthorized: true } } : {}),
          }),
          { schema },
        );
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
