import {
  boolean,
  decimal,
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
export const categoryGroup = pgEnum('category_group', [
  'physical_labour',
  'driver',
  'artisan',
  'office_staff',
  'other',
]);
export const workerAvailability = pgEnum('worker_availability', [
  'offline',
  'available',
  'engaged',
]);
export const rateUnit = pgEnum('rate_unit', ['hour', 'day', 'job']);
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
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  rating: decimal('rating', { precision: 3, scale: 2 }).notNull().default('0'),
  completedJobs: integer('completed_jobs').notNull().default(0),
  verificationStatus: verificationStatus('verification_status')
    .notNull()
    .default('pending'),
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
