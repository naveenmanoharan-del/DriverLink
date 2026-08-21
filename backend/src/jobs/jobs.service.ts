import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import {
  clientProfiles,
  jobApplications,
  jobs,
  workerProfiles,
} from '../database/schema';
import { CreateJobDto } from './dto/create-job.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';

@Injectable()
export class JobsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private async clientIdForUser(userId: string): Promise<string> {
    const client = await this.db.query.clientProfiles.findFirst({
      where: eq(clientProfiles.userId, userId),
    });
    if (!client) throw new NotFoundException('Client profile not found');
    return client.id;
  }

  async create(userId: string, dto: CreateJobDto) {
    const clientId = await this.clientIdForUser(userId);
    const [job] = await this.db
      .insert(jobs)
      .values({
        clientId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        latitude: dto.latitude?.toString(),
        longitude: dto.longitude?.toString(),
        workersRequired: dto.workersRequired ?? 1,
        offeredRate: dto.offeredRate,
        rateUnit: dto.rateUnit ?? 'day',
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      })
      .returning();
    return job;
  }

  async search(query: SearchJobsDto) {
    const conditions = [];
    if (query.categoryId)
      conditions.push(eq(jobs.categoryId, query.categoryId));
    if (query.status)
      conditions.push(
        eq(
          jobs.status,
          query.status as (typeof jobs.status.enumValues)[number],
        ),
      );
    else conditions.push(eq(jobs.status, 'open'));

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const results = await this.db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { data: results, page, pageSize };
  }

  async findMine(userId: string) {
    const clientId = await this.clientIdForUser(userId);
    return this.db
      .select()
      .from(jobs)
      .where(eq(jobs.clientId, clientId))
      .orderBy(desc(jobs.createdAt));
  }

  async findOne(id: string) {
    const job = await this.db.query.jobs.findFirst({ where: eq(jobs.id, id) });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async updateStatus(userId: string, jobId: string, dto: UpdateJobStatusDto) {
    const job = await this.findOne(jobId);
    const clientId = await this.clientIdForUser(userId);
    if (job.clientId !== clientId)
      throw new ForbiddenException('You do not own this job');

    const [updated] = await this.db
      .update(jobs)
      .set({ status: dto.status, updatedAt: new Date() })
      .where(eq(jobs.id, jobId))
      .returning();

    // Only credit the workers on the transition *into* completed, so re-sending
    // the same status doesn't inflate anyone's job count.
    if (dto.status === 'completed' && job.status !== 'completed') {
      await this.creditCompletedJob(jobId);
    }
    return updated;
  }

  /** Increments completed_jobs for every worker whose application was accepted. */
  private async creditCompletedJob(jobId: string) {
    const accepted = await this.db
      .select({ workerId: jobApplications.workerId })
      .from(jobApplications)
      .where(
        and(
          eq(jobApplications.jobId, jobId),
          eq(jobApplications.status, 'accepted'),
        ),
      );
    if (!accepted.length) return;

    await this.db
      .update(workerProfiles)
      .set({
        completedJobs: sql`${workerProfiles.completedJobs} + 1`,
        updatedAt: new Date(),
      })
      .where(
        inArray(
          workerProfiles.id,
          accepted.map((a) => a.workerId),
        ),
      );
  }
}
