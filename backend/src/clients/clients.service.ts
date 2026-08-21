import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import { clientProfiles } from '../database/schema';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';

@Injectable()
export class ClientsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByUserId(userId: string) {
    const profile = await this.db.query.clientProfiles.findFirst({
      where: eq(clientProfiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Client profile not found');
    return profile;
  }

  async updateByUserId(userId: string, dto: UpdateClientProfileDto) {
    const [profile] = await this.db
      .update(clientProfiles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(clientProfiles.userId, userId))
      .returning();
    if (!profile) throw new NotFoundException('Client profile not found');
    return profile;
  }
}
