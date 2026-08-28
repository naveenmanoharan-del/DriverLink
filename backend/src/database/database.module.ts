import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { sslFor } from './ssl';

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
        return drizzle(
          new Pool({ connectionString, ...sslFor(connectionString) }),
          { schema },
        );
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
