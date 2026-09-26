import {
  boolean,
  customType,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['worker', 'client', 'admin']);
// The first five groups are from the original general-labour taxonomy. They
// stay in the enum because existing rows may reference them, but the seed now
// deactivates every category in them — the platform recruits key personnel,
// engineers and office staff for construction and infrastructure projects.
export const categoryGroup = pgEnum('category_group', [
  'physical_labour',
  'driver',
  'artisan',
  'office_staff',
  'other',
  'key_personnel',
  'technical_staff',
  'support_staff',
]);
export const workerBackground = pgEnum('worker_background', [
  'retired_railway',
  'retired_govt',
  'private_sector',
]);
export const workerAvailability = pgEnum('worker_availability', [
  'offline',
  'available',
  'engaged',
]);
export const rateUnit = pgEnum('rate_unit', ['hour', 'day', 'job', 'month']);
export const verificationStatus = pgEnum('verification_status', [
  'pending',
  'verified',
  'rejected',
]);
export const clientType = pgEnum('client_type', ['individual', 'company']);
export const jobStatus = pgEnum('job_status', [
  'open',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
]);
export const applicationStatus = pgEnum('application_status', [
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
]);

/** Where a candidate stands in the owner's recruitment process. */
export const pipelineStatus = pgEnum('pipeline_status', [
  'new',
  'shortlisted',
  'interviewed',
  'placed',
  'on_hold',
  'rejected',
]);
export const placementStatus = pgEnum('placement_status', [
  'active',
  'completed',
  'terminated',
]);
export const contractType = pgEnum('contract_type', [
  'gc',
  'pmc',
  'pgms',
  'pssa',
  'ae',
  'ie',
  'other',
]);

const bytea = customType<{ data: Buffer }>({
  dataType: () => 'bytea',
});

const audit = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 255 }).unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...audit,
});

/**
 * Issued refresh tokens, so a session can actually be ended server-side.
 *
 * Refresh tokens are long-lived (7 days), so without this a stolen one stays
 * usable for a week and logging out — which only clears client storage — does
 * nothing to stop it. Only a SHA-256 of the token is stored: the database never
 * holds a credential that could be replayed if it leaked.
 *
 * Rows are kept after revocation rather than deleted, so a replayed token is
 * recognised as revoked instead of merely unknown.
 */
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Data-driven labour taxonomy so new trades/categories can be added by an admin without a schema migration.
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  group: categoryGroup('group').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  ...audit,
});

export const workerProfiles = pgTable('worker_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id),
  skills: jsonb('skills').$type<string[]>().notNull().default([]),
  yearsExperience: integer('years_experience').notNull().default(0),
  bio: text('bio'),
  availability: workerAvailability('availability').notNull().default('offline'),
  minRate: decimal('min_rate', { precision: 14, scale: 2 }).notNull(),
  rateUnit: rateUnit('rate_unit').notNull().default('day'),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  city: varchar('city', { length: 100 }),
  background: workerBackground('background'),
  // Subset of SECTORS (auth/dto/register-worker.dto.ts) — the sectors the candidate will work in.
  sectors: jsonb('sectors').$type<string[]>().notNull().default([]),
  qualification: varchar('qualification', { length: 255 }),
  lastDesignation: varchar('last_designation', { length: 255 }),
  lastOrganisation: varchar('last_organisation', { length: 255 }),
  retirementYear: integer('retirement_year'),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  rating: decimal('rating', { precision: 3, scale: 2 }).notNull().default('0'),
  completedJobs: integer('completed_jobs').notNull().default(0),
  verificationStatus: verificationStatus('verification_status')
    .notNull()
    .default('pending'),
  pipelineStatus: pipelineStatus('pipeline_status').notNull().default('new'),
  // Private to admins: never returned by the public or worker-facing routes.
  adminNotes: text('admin_notes'),
  ...audit,
});

export const clientProfiles = pgTable('client_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  companyName: varchar('company_name', { length: 255 }),
  clientType: clientType('client_type').notNull().default('individual'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  ...audit,
});

export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clientProfiles.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  location: text('location').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  workersRequired: integer('workers_required').notNull().default(1),
  offeredRate: decimal('offered_rate', { precision: 14, scale: 2 }).notNull(),
  rateUnit: rateUnit('rate_unit').notNull().default('day'),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  status: jobStatus('status').notNull().default('open'),
  ...audit,
});

export const jobApplications = pgTable(
  'job_applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => workerProfiles.id, { onDelete: 'cascade' }),
    proposedRate: decimal('proposed_rate', {
      precision: 14,
      scale: 2,
    }).notNull(),
    message: text('message'),
    status: applicationStatus('status').notNull().default('pending'),
    ...audit,
  },
  (t) => [
    uniqueIndex('job_applications_job_worker_unique').on(t.jobId, t.workerId),
  ],
);

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  fromUserId: uuid('from_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  toUserId: uuid('to_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * A worker's CV, kept in its own table so profile queries never drag the file
 * bytes along. Stored in Postgres rather than object storage: volumes are small
 * (one file per candidate, capped at 5 MB) and it keeps backups in one place.
 */
export const resumes = pgTable('resumes', {
  id: uuid('id').defaultRandom().primaryKey(),
  workerId: uuid('worker_id')
    .notNull()
    .unique()
    .references(() => workerProfiles.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  data: bytea('data').notNull(),
  ...audit,
});

/**
 * A candidate supplied to a company. Recorded by an admin, or automatically
 * when a client accepts an application on the platform.
 *
 * The candidate and client links are nullable (SET NULL) with the names copied
 * in, so deleting an account does not erase placement history or skew the
 * "placed per company" figures.
 */
export const placements = pgTable(
  'placements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workerId: uuid('worker_id').references(() => workerProfiles.id, {
      onDelete: 'set null',
    }),
    candidateName: varchar('candidate_name', { length: 255 }).notNull(),
    clientId: uuid('client_id').references(() => clientProfiles.id, {
      onDelete: 'set null',
    }),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    position: varchar('position', { length: 255 }).notNull(),
    projectName: varchar('project_name', { length: 255 }),
    contractType: contractType('contract_type').notNull().default('other'),
    sector: varchar('sector', { length: 20 }),
    location: varchar('location', { length: 255 }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    monthlyRemuneration: decimal('monthly_remuneration', {
      precision: 14,
      scale: 2,
    }),
    status: placementStatus('status').notNull().default('active'),
    notes: text('notes'),
    applicationId: uuid('application_id')
      .unique()
      .references(() => jobApplications.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...audit,
  },
  (t) => [
    index('placements_worker_idx').on(t.workerId),
    index('placements_company_idx').on(t.companyName),
  ],
);

/** Every change an admin makes, for accountability and undo-by-hand. */
export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    actorLabel: varchar('actor_label', { length: 255 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    targetType: varchar('target_type', { length: 32 }).notNull(),
    targetId: uuid('target_id'),
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index('admin_audit_created_idx').on(t.createdAt)],
);
