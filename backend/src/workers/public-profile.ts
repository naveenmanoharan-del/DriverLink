import type { workerProfiles } from '../database/schema';

type WorkerProfile = typeof workerProfiles.$inferSelect;

/**
 * A worker profile minus the fields only admins may see: private notes and
 * where the candidate stands in the recruitment pipeline (a candidate should
 * not learn they were marked "rejected" by reading their own profile).
 *
 * Every route that returns a profile to a non-admin must go through this.
 */
export function publicProfile(profile: WorkerProfile) {
  const {
    adminNotes: _adminNotes,
    pipelineStatus: _pipelineStatus,
    ...rest
  } = profile;
  return rest;
}

export function publicProfileOrNull(profile: WorkerProfile | undefined) {
  return profile ? publicProfile(profile) : profile;
}
