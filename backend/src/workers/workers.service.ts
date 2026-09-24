import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import { categories, users, workerProfiles } from '../database/schema';
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
    if (dto.categoryId) {
      const category = await this.db.query.categories.findFirst({
        where: eq(categories.id, dto.categoryId),
      });
      if (!category?.isActive)
        throw new BadRequestException('Choose one of the listed positions');
    }
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
      .select({ profile: workerProfiles })
      .from(workerProfiles)
      .innerJoin(users, eq(users.id, workerProfiles.userId))
      .where(and(eq(users.isActive, true), where))
      // A stable order, or pages overlap and skip people.
      .orderBy(desc(workerProfiles.createdAt), asc(workerProfiles.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { data: results.map((r) => r.profile), page, pageSize };
  }
}
