import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE } from './database/database.module';
import type { Database } from './database/database.module';

@Injectable()
export class AppService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Queries the database, not just the process. Two reasons: a health check
   * that passes while every real request 500s is worse than none, and the
   * keep-warm job's pings through here are what stop Supabase's free tier
   * from pausing the project after a week without queries.
   */
  async health() {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        database: 'unreachable',
      });
    }
    return {
      status: 'ok',
      service: 'manpower-backend',
      database: 'ok',
      time: new Date().toISOString(),
    };
  }
}
