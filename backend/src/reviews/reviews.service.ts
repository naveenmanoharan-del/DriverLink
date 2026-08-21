import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { avg, eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import { jobs, reviews, workerProfiles } from '../database/schema';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(fromUserId: string, jobId: string, dto: CreateReviewDto) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });
    if (!job) throw new NotFoundException('Job not found');

    const [review] = await this.db
      .insert(reviews)
      .values({
        jobId,
        fromUserId,
        toUserId: dto.toUserId,
        rating: dto.rating,
        comment: dto.comment,
      })
      .returning();

    await this.refreshWorkerRating(dto.toUserId);
    return review;
  }

  listForUser(userId: string) {
    return this.db.select().from(reviews).where(eq(reviews.toUserId, userId));
  }

  /**
   * Recomputes the reviewed user's average rating from every review they've
   * received. The aggregate is denormalised onto worker_profiles so the worker
   * directory and profile screens can show a rating without a join; without
   * this the column stays at its 0 default forever.
   */
  private async refreshWorkerRating(userId: string) {
    const [row] = await this.db
      .select({ average: avg(reviews.rating) })
      .from(reviews)
      .where(eq(reviews.toUserId, userId));

    // avg() returns null when the user has no reviews, and a numeric string otherwise.
    const average = row?.average == null ? 0 : Number(row.average);

    await this.db
      .update(workerProfiles)
      .set({ rating: average.toFixed(2), updatedAt: new Date() })
      .where(eq(workerProfiles.userId, userId));
  }
}
