import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import { workerProfiles } from '../database/schema';
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto';
import { SearchWorkersDto } from './dto/search-workers.dto';

@Injectable()
export class WorkersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByUserId(userId: string) {
    const profile = await this.db.query.workerProfiles.findFirst({
      where: eq(workerProfiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Worker profile not found');
    return profile;
  }

  async findOne(id: string) {
    const profile = await this.db.query.workerProfiles.findFirst({
      where: eq(workerProfiles.id, id),
    });
    if (!profile) throw new NotFoundException('Worker not found');
    return profile;
  }

  async updateByUserId(userId: string, dto: UpdateWorkerProfileDto) {
    const [profile] = await this.db
      .update(workerProfiles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(workerProfiles.userId, userId))
      .returning();
    if (!profile) throw new NotFoundException('Worker profile not found');
    return profile;
  }

  async search(query: SearchWorkersDto) {
    const conditions = [];
    if (query.categoryId)
      conditions.push(eq(workerProfiles.categoryId, query.categoryId));
    if (query.city) conditions.push(eq(workerProfiles.city, query.city));
    if (query.availability)
      conditions.push(
        eq(
          workerProfiles.availability,
          query.availability as 'offline' | 'available' | 'engaged',
        ),
      );

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = conditions.length ? and(...conditions) : undefined;

    const results = await this.db
      .select()
      .from(workerProfiles)
      .where(where)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { data: results, page, pageSize };
  }
}
