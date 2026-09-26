import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import {
  categories,
  clientProfiles,
  jobApplications,
  jobs,
  users,
  workerProfiles,
} from '../database/schema';
import { detailsTable, MailService } from '../mail/mail.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly mail: MailService,
  ) {}

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
    // Not awaited: posting shouldn't wait on the mail provider, and a mail
    // failure must not undo a saved requirement.
    void this.notifyJobPosted(userId, job);
    return job;
  }

  /** Emails the owner every new requirement, with who posted it and how to reach them. */
  private async notifyJobPosted(userId: string, job: typeof jobs.$inferSelect) {
    try {
      const [client, user, category] = await Promise.all([
        this.db.query.clientProfiles.findFirst({
          where: eq(clientProfiles.userId, userId),
        }),
        this.db.query.users.findFirst({ where: eq(users.id, userId) }),
        this.db.query.categories.findFirst({
          where: eq(categories.id, job.categoryId),
        }),
      ]);
      const who = client?.companyName || client?.name || 'a client';
      await this.mail.notifyAdmin(
        `New job requirement: ${job.title} - ${who}`,
        `<p style="font-family:sans-serif">A client posted a new requirement on Yukti Solutions.</p>` +
          detailsTable([
            ['Position', job.title],
            ['Role', category?.name],
            ['Location', job.location],
            ['Positions', job.workersRequired],
            [
              'Offered rate',
              `${job.currency} ${job.offeredRate} / ${job.rateUnit}`,
            ],
            ['Starts', job.startsAt.toISOString().slice(0, 10)],
            ['Ends', job.endsAt?.toISOString().slice(0, 10)],
            ['Description', job.description],
            ['Client', client?.name],
            ['Company', client?.companyName],
            ['Phone', user?.phone],
            ['Email', user?.email],
            ['City', client?.city],
          ]),
      );
    } catch (err) {
      // notifyAdmin already logs send failures; this covers the lookups.
      this.logger.warn(`Job ${job.id}: notification skipped: ${String(err)}`);
    }
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

  /** A client's own job. Jobs are requirements sent to the admin, not public listings. */
  async findOwn(userId: string, id: string) {
    const job = await this.findOne(id);
    const clientId = await this.clientIdForUser(userId);
    if (job.clientId !== clientId)
      throw new ForbiddenException('You do not own this job');
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
