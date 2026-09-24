import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import {
  adminAuditLog,
  categories,
  clientProfiles,
  jobApplications,
  jobs,
  placements,
  refreshTokens,
  resumes,
  users,
  workerProfiles,
} from '../database/schema';
import type {
  AuditQueryDto,
  CandidateQueryDto,
  ClientQueryDto,
  CreateAdminDto,
  CreatePlacementDto,
  PlacementQueryDto,
  UpdateCandidateDto,
  UpdatePlacementDto,
} from './dto/admin.dto';

export interface Actor {
  userId: string;
}

/** Escapes LIKE wildcards so a search for "50%" means the literal text. */
function likeTerm(q: string) {
  return `%${q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * The DTO's own keys that were actually sent. Validated DTOs carry every
 * declared optional field as an own `undefined` property, so Object.keys()
 * alone is never empty.
 */
function provided<T extends object>(dto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dto).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

/** Postgres returns counts as strings; the dashboard wants numbers. */
function num(value: unknown) {
  return Number(value ?? 0);
}

/** Wording used in the activity log. */
const ROLE_LABEL: Record<string, string> = {
  worker: 'candidate',
  client: 'client',
  admin: 'admin',
};

/** Every chart groups in India's time zone, so "this week" matches the owner's. */
const TZ = 'Asia/Kolkata';

const candidateName = sql<string>`trim(${workerProfiles.firstName} || ' ' || coalesce(${workerProfiles.lastName}, ''))`;
const hasResume = sql<boolean>`exists (select 1 from ${resumes} where ${resumes.workerId} = ${workerProfiles.id})`;

@Injectable()
export class AdminService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // ---------------------------------------------------------------------
  // Audit log
  // ---------------------------------------------------------------------

  private async audit(
    actor: Actor,
    action: string,
    targetType: string,
    targetId: string | null,
    summary: string,
  ) {
    const [me] = await this.db
      .select({ phone: users.phone, email: users.email })
      .from(users)
      .where(eq(users.id, actor.userId));
    await this.db.insert(adminAuditLog).values({
      actorId: actor.userId,
      actorLabel: me?.email ?? me?.phone ?? 'unknown admin',
      action,
      targetType,
      targetId,
      summary,
    });
  }

  async auditLog(query: AuditQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = query.targetType
      ? eq(adminAuditLog.targetType, query.targetType)
      : undefined;
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(adminAuditLog)
        .where(where)
        .orderBy(desc(adminAuditLog.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.select({ total: count() }).from(adminAuditLog).where(where),
    ]);
    return { data: rows, page, pageSize, total };
  }

  // ---------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------

  async stats(days?: number) {
    // Breakdowns can be scoped to recent registrations; totals are all-time.
    const since = days
      ? sql`and u.created_at >= now() - make_interval(days => ${days})`
      : sql``;
    const rows = async <T>(query: SQL) =>
      (await this.db.execute(query)).rows as T[];

    const [
      [totals],
      weekly,
      byGroup,
      byCategory,
      byBackground,
      bySector,
      byPipeline,
      byCity,
      byExperience,
      byCompany,
      byContractType,
      placementsMonthly,
      recent,
    ] = await Promise.all([
      rows<Record<string, string>>(sql`
        select
          (select count(*) from users where role = 'worker') as candidates,
          (select count(*) from users where role = 'worker' and is_active) as candidates_active,
          (select count(*) from users where role = 'worker' and created_at >= now() - interval '7 days') as candidates_7d,
          (select count(*) from users where role = 'worker' and created_at >= now() - interval '14 days' and created_at < now() - interval '7 days') as candidates_prev_7d,
          (select count(*) from users where role = 'worker' and created_at >= now() - interval '30 days') as candidates_30d,
          (select count(*) from users where role = 'client') as clients,
          (select count(*) from users where role = 'client' and created_at >= now() - interval '30 days') as clients_30d,
          (select count(*) from resumes) as with_resume,
          (select count(*) from worker_profiles where background = 'retired_railway') as retired_railway,
          (select count(*) from worker_profiles where pipeline_status = 'new') as awaiting_review,
          (select count(*) from placements) as placements_total,
          (select count(*) from placements where status = 'active') as placements_active,
          (select count(distinct worker_id) from placements where worker_id is not null) as placed_candidates,
          (select count(distinct lower(company_name)) from placements) as companies_served,
          (select count(*) from jobs where status = 'open') as open_jobs
      `),
      rows<{ week: string; candidates: string; clients: string }>(sql`
        select to_char(w, 'YYYY-MM-DD') as week,
          count(u.id) filter (where u.role = 'worker') as candidates,
          count(u.id) filter (where u.role = 'client') as clients
        from generate_series(
          date_trunc('week', now() at time zone ${TZ}) - interval '11 weeks',
          date_trunc('week', now() at time zone ${TZ}),
          interval '1 week') w
        left join users u
          on date_trunc('week', u.created_at at time zone ${TZ}) = w
        group by w order by w
      `),
      rows<{ key: string; count: string }>(sql`
        select c."group" as key, count(*) as count
        from worker_profiles wp
        join users u on u.id = wp.user_id
        join categories c on c.id = wp.category_id
        where true ${since}
        group by 1 order by 2 desc
      `),
      rows<{ key: string; group: string; count: string }>(sql`
        select c.name as key, c."group" as group, count(*) as count
        from worker_profiles wp
        join users u on u.id = wp.user_id
        join categories c on c.id = wp.category_id
        where true ${since}
        group by 1, 2 order by 3 desc, 1 limit 15
      `),
      rows<{ key: string; count: string }>(sql`
        select coalesce(wp.background::text, 'unspecified') as key, count(*) as count
        from worker_profiles wp join users u on u.id = wp.user_id
        where true ${since}
        group by 1 order by 2 desc
      `),
      rows<{ key: string; count: string }>(sql`
        select s as key, count(*) as count
        from worker_profiles wp
        join users u on u.id = wp.user_id
        cross join lateral jsonb_array_elements_text(wp.sectors) s
        where true ${since}
        group by 1 order by 2 desc
      `),
      rows<{ key: string; count: string }>(sql`
        select wp.pipeline_status::text as key, count(*) as count
        from worker_profiles wp join users u on u.id = wp.user_id
        where true ${since}
        group by 1
      `),
      rows<{ key: string; count: string }>(sql`
        select initcap(trim(wp.city)) as key, count(*) as count
        from worker_profiles wp join users u on u.id = wp.user_id
        where coalesce(trim(wp.city), '') <> '' ${since}
        group by 1 order by 2 desc, 1 limit 10
      `),
      rows<{ key: string; count: string }>(sql`
        select band as key, count(*) as count from (
          select case
            when wp.years_experience < 5 then '0–4 yrs'
            when wp.years_experience < 10 then '5–9 yrs'
            when wp.years_experience < 20 then '10–19 yrs'
            when wp.years_experience < 30 then '20–29 yrs'
            else '30+ yrs' end as band,
            wp.years_experience
          from worker_profiles wp join users u on u.id = wp.user_id
          where true ${since}
        ) b group by band order by min(years_experience)
      `),
      rows<{ key: string; count: string; active: string }>(sql`
        select min(company_name) as key, count(*) as count,
          count(*) filter (where status = 'active') as active
        from placements group by lower(company_name)
        order by 2 desc, 1 limit 12
      `),
      rows<{ key: string; count: string }>(sql`
        select contract_type::text as key, count(*) as count
        from placements group by 1 order by 2 desc
      `),
      rows<{ month: string; count: string }>(sql`
        select to_char(m, 'YYYY-MM') as month, count(p.id) as count
        from generate_series(
          date_trunc('month', now() at time zone ${TZ}) - interval '11 months',
          date_trunc('month', now() at time zone ${TZ}),
          interval '1 month') m
        left join placements p on date_trunc('month', p.start_date) = m
        group by m order by m
      `),
      this.db
        .select({
          id: workerProfiles.id,
          name: candidateName,
          category: categories.name,
          background: workerProfiles.background,
          createdAt: workerProfiles.createdAt,
          hasResume,
        })
        .from(workerProfiles)
        .innerJoin(categories, eq(categories.id, workerProfiles.categoryId))
        .orderBy(desc(workerProfiles.createdAt))
        .limit(8),
    ]);

    const keyed = (list: { key: string; count: string }[]) =>
      list.map((r) => ({ key: r.key, count: num(r.count) }));

    return {
      totals: Object.fromEntries(
        Object.entries(totals).map(([k, v]) => [k, num(v)]),
      ),
      weekly: weekly.map((w) => ({
        week: w.week,
        candidates: num(w.candidates),
        clients: num(w.clients),
      })),
      byGroup: keyed(byGroup),
      byCategory: byCategory.map((r) => ({
        key: r.key,
        group: r.group,
        count: num(r.count),
      })),
      byBackground: keyed(byBackground),
      bySector: keyed(bySector),
      byPipeline: keyed(byPipeline),
      byCity: keyed(byCity),
      byExperience: keyed(byExperience),
      byCompany: byCompany.map((r) => ({
        key: r.key,
        count: num(r.count),
        active: num(r.active),
      })),
      byContractType: keyed(byContractType),
      placementsMonthly: placementsMonthly.map((m) => ({
        month: m.month,
        count: num(m.count),
      })),
      recent,
      days: days ?? null,
    };
  }

  // ---------------------------------------------------------------------
  // Candidates
  // ---------------------------------------------------------------------

  private candidateWhere(q: CandidateQueryDto) {
    const c: SQL[] = [];
    if (q.q) {
      const term = likeTerm(q.q);
      c.push(
        or(
          ilike(candidateName, term),
          ilike(users.phone, term),
          ilike(users.email, term),
          ilike(workerProfiles.qualification, term),
          ilike(workerProfiles.lastDesignation, term),
          ilike(workerProfiles.lastOrganisation, term),
          ilike(workerProfiles.city, term),
          ilike(categories.name, term),
        )!,
      );
    }
    if (q.group) c.push(eq(categories.group, q.group));
    if (q.categoryId) c.push(eq(workerProfiles.categoryId, q.categoryId));
    if (q.background) c.push(eq(workerProfiles.background, q.background));
    if (q.sector) c.push(sql`${workerProfiles.sectors} ? ${q.sector}`);
    if (q.pipelineStatus)
      c.push(eq(workerProfiles.pipelineStatus, q.pipelineStatus));
    if (q.verificationStatus)
      c.push(eq(workerProfiles.verificationStatus, q.verificationStatus));
    if (q.hasResume !== undefined)
      c.push(q.hasResume ? hasResume : sql`not ${hasResume}`);
    if (q.isActive !== undefined) c.push(eq(users.isActive, q.isActive));
    if (q.city) c.push(ilike(workerProfiles.city, likeTerm(q.city)));
    if (q.minExperience !== undefined)
      c.push(gte(workerProfiles.yearsExperience, q.minExperience));
    if (q.maxExperience !== undefined)
      c.push(lte(workerProfiles.yearsExperience, q.maxExperience));
    if (q.registeredFrom)
      c.push(gte(workerProfiles.createdAt, new Date(q.registeredFrom)));
    if (q.registeredTo) {
      // Inclusive of the whole "to" day.
      const to = new Date(q.registeredTo);
      to.setUTCDate(to.getUTCDate() + 1);
      c.push(sql`${workerProfiles.createdAt} < ${to}`);
    }
    return c.length ? and(...c) : undefined;
  }

  private candidateSelect() {
    return this.db
      .select({
        id: workerProfiles.id,
        userId: users.id,
        name: candidateName,
        firstName: workerProfiles.firstName,
        lastName: workerProfiles.lastName,
        phone: users.phone,
        email: users.email,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        categoryId: workerProfiles.categoryId,
        category: categories.name,
        group: categories.group,
        background: workerProfiles.background,
        sectors: workerProfiles.sectors,
        qualification: workerProfiles.qualification,
        yearsExperience: workerProfiles.yearsExperience,
        lastDesignation: workerProfiles.lastDesignation,
        lastOrganisation: workerProfiles.lastOrganisation,
        retirementYear: workerProfiles.retirementYear,
        city: workerProfiles.city,
        minRate: workerProfiles.minRate,
        rateUnit: workerProfiles.rateUnit,
        pipelineStatus: workerProfiles.pipelineStatus,
        verificationStatus: workerProfiles.verificationStatus,
        adminNotes: workerProfiles.adminNotes,
        hasResume,
        createdAt: workerProfiles.createdAt,
        updatedAt: workerProfiles.updatedAt,
      })
      .from(workerProfiles)
      .innerJoin(users, eq(users.id, workerProfiles.userId))
      .innerJoin(categories, eq(categories.id, workerProfiles.categoryId));
  }

  private candidateOrder(sort: CandidateQueryDto['sort']) {
    switch (sort) {
      case 'oldest':
        return [asc(workerProfiles.createdAt)];
      case 'name':
        return [asc(sql`lower(${candidateName})`)];
      case 'experience_desc':
        return [
          desc(workerProfiles.yearsExperience),
          desc(workerProfiles.createdAt),
        ];
      case 'experience_asc':
        return [
          asc(workerProfiles.yearsExperience),
          desc(workerProfiles.createdAt),
        ];
      default:
        return [desc(workerProfiles.createdAt)];
    }
  }

  async listCandidates(q: CandidateQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 25;
    const where = this.candidateWhere(q);
    const [data, [{ total }]] = await Promise.all([
      this.candidateSelect()
        .where(where)
        .orderBy(...this.candidateOrder(q.sort), asc(workerProfiles.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(workerProfiles)
        .innerJoin(users, eq(users.id, workerProfiles.userId))
        .innerJoin(categories, eq(categories.id, workerProfiles.categoryId))
        .where(where),
    ]);
    return { data, page, pageSize, total };
  }

  /** All matching candidates (capped) for the CSV export. */
  exportCandidates(q: CandidateQueryDto) {
    return this.candidateSelect()
      .where(this.candidateWhere(q))
      .orderBy(...this.candidateOrder(q.sort), asc(workerProfiles.id))
      .limit(10_000);
  }

  async getCandidate(id: string) {
    const [candidate] = await this.candidateSelect().where(
      eq(workerProfiles.id, id),
    );
    if (!candidate) throw new NotFoundException('Candidate not found');
    const [resume, placementRows, applications] = await Promise.all([
      this.db
        .select({
          fileName: resumes.fileName,
          mimeType: resumes.mimeType,
          sizeBytes: resumes.sizeBytes,
          updatedAt: resumes.updatedAt,
        })
        .from(resumes)
        .where(eq(resumes.workerId, id)),
      this.db
        .select()
        .from(placements)
        .where(eq(placements.workerId, id))
        .orderBy(desc(placements.startDate)),
      this.db
        .select({
          id: jobApplications.id,
          status: jobApplications.status,
          createdAt: jobApplications.createdAt,
          jobTitle: jobs.title,
          jobId: jobs.id,
        })
        .from(jobApplications)
        .innerJoin(jobs, eq(jobs.id, jobApplications.jobId))
        .where(eq(jobApplications.workerId, id))
        .orderBy(desc(jobApplications.createdAt)),
    ]);
    return {
      ...candidate,
      resume: resume[0] ?? null,
      placements: placementRows,
      applications,
    };
  }

  async updateCandidate(id: string, input: UpdateCandidateDto, actor: Actor) {
    const dto = provided(input);
    if (Object.keys(dto).length === 0)
      throw new BadRequestException('Nothing to update');
    const [updated] = await this.db
      .update(workerProfiles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(workerProfiles.id, id))
      .returning({
        id: workerProfiles.id,
        firstName: workerProfiles.firstName,
        lastName: workerProfiles.lastName,
      });
    if (!updated) throw new NotFoundException('Candidate not found');
    const changes = Object.entries(dto)
      .map(([k, v]) => (k === 'adminNotes' ? 'notes' : `${k} → ${String(v)}`))
      .join(', ');
    await this.audit(
      actor,
      'candidate.update',
      'candidate',
      id,
      `Updated ${[updated.firstName, updated.lastName].filter(Boolean).join(' ')}: ${changes}`,
    );
    return this.getCandidate(id);
  }

  async candidateResume(id: string) {
    const row = await this.db.query.resumes.findFirst({
      where: eq(resumes.workerId, id),
    });
    if (!row) throw new NotFoundException('This candidate has no resume');
    return row;
  }

  // ---------------------------------------------------------------------
  // Clients
  // ---------------------------------------------------------------------

  async listClients(q: ClientQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 25;
    const c: SQL[] = [];
    if (q.q) {
      const term = likeTerm(q.q);
      c.push(
        or(
          ilike(clientProfiles.name, term),
          ilike(clientProfiles.companyName, term),
          ilike(users.phone, term),
          ilike(users.email, term),
          ilike(clientProfiles.city, term),
        )!,
      );
    }
    if (q.isActive !== undefined) c.push(eq(users.isActive, q.isActive));
    const where = c.length ? and(...c) : undefined;
    const jobCount = sql<number>`(select count(*)::int from ${jobs} where ${jobs.clientId} = ${clientProfiles.id})`;
    const placementCount = sql<number>`(select count(*)::int from ${placements} where ${placements.clientId} = ${clientProfiles.id})`;
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: clientProfiles.id,
          userId: users.id,
          name: clientProfiles.name,
          companyName: clientProfiles.companyName,
          clientType: clientProfiles.clientType,
          city: clientProfiles.city,
          phone: users.phone,
          email: users.email,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: clientProfiles.createdAt,
          jobCount,
          placementCount,
        })
        .from(clientProfiles)
        .innerJoin(users, eq(users.id, clientProfiles.userId))
        .where(where)
        .orderBy(desc(clientProfiles.createdAt), asc(clientProfiles.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(clientProfiles)
        .innerJoin(users, eq(users.id, clientProfiles.userId))
        .where(where),
    ]);
    return { data, page, pageSize, total };
  }

  async getClient(id: string) {
    const [client] = await this.db
      .select({
        id: clientProfiles.id,
        userId: users.id,
        name: clientProfiles.name,
        companyName: clientProfiles.companyName,
        clientType: clientProfiles.clientType,
        city: clientProfiles.city,
        address: clientProfiles.address,
        phone: users.phone,
        email: users.email,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: clientProfiles.createdAt,
      })
      .from(clientProfiles)
      .innerJoin(users, eq(users.id, clientProfiles.userId))
      .where(eq(clientProfiles.id, id));
    if (!client) throw new NotFoundException('Client not found');
    const [jobRows, placementRows] = await Promise.all([
      this.db
        .select({
          id: jobs.id,
          title: jobs.title,
          status: jobs.status,
          location: jobs.location,
          startsAt: jobs.startsAt,
          createdAt: jobs.createdAt,
          applications: sql<number>`(select count(*)::int from ${jobApplications} where ${jobApplications.jobId} = ${jobs.id})`,
        })
        .from(jobs)
        .where(eq(jobs.clientId, id))
        .orderBy(desc(jobs.createdAt)),
      this.db
        .select()
        .from(placements)
        .where(eq(placements.clientId, id))
        .orderBy(desc(placements.startDate)),
    ]);
    return { ...client, jobs: jobRows, placements: placementRows };
  }

  // ---------------------------------------------------------------------
  // Accounts (any role)
  // ---------------------------------------------------------------------

  private async describeUser(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new NotFoundException('Account not found');
    let label = user.phone;
    if (user.role === 'worker') {
      const p = await this.db.query.workerProfiles.findFirst({
        where: eq(workerProfiles.userId, userId),
      });
      if (p)
        label = `${[p.firstName, p.lastName].filter(Boolean).join(' ')} (${user.phone})`;
    } else if (user.role === 'client') {
      const p = await this.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.userId, userId),
      });
      if (p) label = `${p.companyName || p.name} (${user.phone})`;
    }
    return { user, label };
  }

  /** An admin can't lock out or delete the last way into the admin panel. */
  private async assertNotLastAdmin(user: typeof users.$inferSelect) {
    if (user.role !== 'admin' || !user.isActive) return;
    const [{ n }] = await this.db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.isActive, true)));
    if (n <= 1)
      throw new ForbiddenException('This is the only active admin account');
  }

  async setActive(userId: string, isActive: boolean, actor: Actor) {
    if (userId === actor.userId)
      throw new ForbiddenException('You cannot deactivate your own account');
    const { user, label } = await this.describeUser(userId);
    if (!isActive) await this.assertNotLastAdmin(user);
    await this.db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId));
    // Deactivating also ends every session, so it takes effect everywhere.
    if (!isActive)
      await this.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.userId, userId),
            isNull(refreshTokens.revokedAt),
          ),
        );
    await this.audit(
      actor,
      isActive ? 'account.activate' : 'account.deactivate',
      user.role,
      userId,
      `${isActive ? 'Reactivated' : 'Deactivated'} ${ROLE_LABEL[user.role]} ${label}`,
    );
    return { userId, isActive };
  }

  /**
   * Permanently deletes an account and everything hanging off it (profile,
   * resume, applications, sessions; for clients their jobs). Placements keep
   * their copied names so the history and statistics survive.
   */
  async deleteUser(userId: string, actor: Actor) {
    if (userId === actor.userId)
      throw new ForbiddenException('You cannot delete your own account');
    const { user, label } = await this.describeUser(userId);
    await this.assertNotLastAdmin(user);
    await this.db.delete(users).where(eq(users.id, userId));
    await this.audit(
      actor,
      'account.delete',
      user.role,
      userId,
      `Deleted ${ROLE_LABEL[user.role]} ${label}`,
    );
    return { deleted: true };
  }

  // ---------------------------------------------------------------------
  // Placements
  // ---------------------------------------------------------------------

  async listPlacements(q: PlacementQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 25;
    const c: SQL[] = [];
    if (q.q) {
      const term = likeTerm(q.q);
      c.push(
        or(
          ilike(placements.candidateName, term),
          ilike(placements.companyName, term),
          ilike(placements.position, term),
          ilike(placements.projectName, term),
          ilike(placements.location, term),
        )!,
      );
    }
    if (q.status) c.push(eq(placements.status, q.status));
    if (q.contractType) c.push(eq(placements.contractType, q.contractType));
    if (q.workerId) c.push(eq(placements.workerId, q.workerId));
    const where = c.length ? and(...c) : undefined;
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(placements)
        .where(where)
        .orderBy(desc(placements.startDate), desc(placements.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.select({ total: count() }).from(placements).where(where),
    ]);
    return { data, page, pageSize, total };
  }

  private checkDates(start?: string, end?: string | null) {
    if (start && end && end < start)
      throw new BadRequestException('End date cannot be before start date');
  }

  async createPlacement(dto: CreatePlacementDto, actor: Actor) {
    this.checkDates(dto.startDate, dto.endDate);
    let name = dto.candidateName?.trim();
    if (dto.workerId) {
      const worker = await this.db.query.workerProfiles.findFirst({
        where: eq(workerProfiles.id, dto.workerId),
      });
      if (!worker) throw new NotFoundException('Candidate not found');
      name = [worker.firstName, worker.lastName].filter(Boolean).join(' ');
    }
    if (!name)
      throw new BadRequestException(
        'Choose a registered candidate or enter a candidate name',
      );
    if (dto.clientId) {
      const client = await this.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.id, dto.clientId),
      });
      if (!client) throw new NotFoundException('Client not found');
    }
    const [row] = await this.db
      .insert(placements)
      .values({
        ...dto,
        candidateName: name,
        companyName: dto.companyName.trim(),
        position: dto.position.trim(),
        createdBy: actor.userId,
      })
      .returning();
    if (dto.workerId && row.status === 'active')
      await this.db
        .update(workerProfiles)
        .set({ pipelineStatus: 'placed', updatedAt: new Date() })
        .where(eq(workerProfiles.id, dto.workerId));
    await this.audit(
      actor,
      'placement.create',
      'placement',
      row.id,
      `Placed ${name} at ${row.companyName} as ${row.position}`,
    );
    return row;
  }

  async updatePlacement(id: string, input: UpdatePlacementDto, actor: Actor) {
    const dto = provided(input);
    if (Object.keys(dto).length === 0)
      throw new BadRequestException('Nothing to update');
    const existing = await this.db.query.placements.findFirst({
      where: eq(placements.id, id),
    });
    if (!existing) throw new NotFoundException('Placement not found');
    this.checkDates(
      dto.startDate ?? existing.startDate,
      dto.endDate === undefined ? existing.endDate : dto.endDate,
    );
    const [row] = await this.db
      .update(placements)
      .set({
        ...dto,
        companyName: dto.companyName?.trim(),
        position: dto.position?.trim(),
        updatedAt: new Date(),
      })
      .where(eq(placements.id, id))
      .returning();
    await this.audit(
      actor,
      'placement.update',
      'placement',
      id,
      `Updated placement of ${row.candidateName} at ${row.companyName}: ${Object.keys(dto).join(', ')}`,
    );
    return row;
  }

  async deletePlacement(id: string, actor: Actor) {
    const [row] = await this.db
      .delete(placements)
      .where(eq(placements.id, id))
      .returning();
    if (!row) throw new NotFoundException('Placement not found');
    await this.audit(
      actor,
      'placement.delete',
      'placement',
      id,
      `Deleted placement of ${row.candidateName} at ${row.companyName}`,
    );
    return { deleted: true };
  }

  /** Known company names, for autocomplete when recording a placement. */
  async companies() {
    const result = await this.db.execute(sql`
      select name from (
        select company_name as name from placements
        union select company_name from client_profiles where company_name is not null
      ) n where coalesce(trim(name), '') <> '' group by name order by lower(name) limit 500
    `);
    return (result.rows as { name: string }[]).map((r) => r.name);
  }

  // ---------------------------------------------------------------------
  // Admin users
  // ---------------------------------------------------------------------

  listAdmins() {
    return this.db
      .select({
        id: users.id,
        phone: users.phone,
        email: users.email,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(asc(users.createdAt));
  }

  async createAdmin(dto: CreateAdminDto, actor: Actor) {
    const email = dto.email?.trim().toLowerCase() || undefined;
    const existing = await this.db.query.users.findFirst({
      where: email
        ? or(eq(users.phone, dto.phone), eq(users.email, email))
        : eq(users.phone, dto.phone),
    });
    if (existing)
      throw new ConflictException(
        'That phone number or email already belongs to an account',
      );
    const [row] = await this.db
      .insert(users)
      .values({
        phone: dto.phone,
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: 'admin',
      })
      .returning({
        id: users.id,
        phone: users.phone,
        email: users.email,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      });
    await this.audit(
      actor,
      'admin.create',
      'admin',
      row.id,
      `Added admin ${row.phone}`,
    );
    return row;
  }
}
