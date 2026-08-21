import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import {
  clientProfiles,
  jobApplications,
  jobs,
  workerProfiles,
} from '../database/schema';
import { CreateApplicationDto } from './dto/create-application.dto';
import { DecideApplicationDto } from './dto/decide-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private async workerIdForUser(userId: string): Promise<string> {
    const worker = await this.db.query.workerProfiles.findFirst({
      where: eq(workerProfiles.userId, userId),
    });
    if (!worker) throw new NotFoundException('Worker profile not found');
    return worker.id;
  }

  private async clientIdForUser(userId: string): Promise<string> {
    const client = await this.db.query.clientProfiles.findFirst({
      where: eq(clientProfiles.userId, userId),
    });
    if (!client) throw new NotFoundException('Client profile not found');
    return client.id;
  }

  async apply(userId: string, jobId: string, dto: CreateApplicationDto) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== 'open')
      throw new ConflictException(
        'This job is no longer accepting applications',
      );

    const workerId = await this.workerIdForUser(userId);
    const existing = await this.db
      .select()
      .from(jobApplications)
      .where(
        and(
          eq(jobApplications.jobId, jobId),
          eq(jobApplications.workerId, workerId),
        ),
      );
    if (existing.length > 0)
      throw new ConflictException('You have already applied to this job');

    const [application] = await this.db
      .insert(jobApplications)
      .values({
        jobId,
        workerId,
        proposedRate: dto.proposedRate,
        message: dto.message,
      })
      .returning();
    return application;
  }

  async listForJob(userId: string, jobId: string) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });
    if (!job) throw new NotFoundException('Job not found');
    const clientId = await this.clientIdForUser(userId);
    if (job.clientId !== clientId)
      throw new ForbiddenException('You do not own this job');
    return this.db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.jobId, jobId));
  }

  async mine(userId: string) {
    const workerId = await this.workerIdForUser(userId);
    return this.db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.workerId, workerId));
  }

  async decide(
    userId: string,
    applicationId: string,
    dto: DecideApplicationDto,
  ) {
    const application = await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
    });
    if (!application) throw new NotFoundException('Application not found');

    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, application.jobId),
    });
    if (!job) throw new NotFoundException('Job not found');

    const clientId = await this.clientIdForUser(userId);
    if (job.clientId !== clientId)
      throw new ForbiddenException('You do not own this job');

    const [updated] = await this.db
      .update(jobApplications)
      .set({ status: dto.status, updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId))
      .returning();

    if (dto.status === 'accepted' && job.status === 'open') {
      await this.db
        .update(jobs)
        .set({ status: 'assigned', updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
    }

    return updated;
  }

  async withdraw(userId: string, applicationId: string) {
    const workerId = await this.workerIdForUser(userId);
    const application = await this.db.query.jobApplications.findFirst({
      where: eq(jobApplications.id, applicationId),
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.workerId !== workerId)
      throw new ForbiddenException('This is not your application');

    const [updated] = await this.db
      .update(jobApplications)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(eq(jobApplications.id, applicationId))
      .returning();
    return updated;
  }
}
