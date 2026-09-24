export type Role = 'worker' | 'client' | 'admin';
export type CategoryGroup = 'key_personnel' | 'technical_staff' | 'support_staff';
export type RateUnit = 'hour' | 'day' | 'job' | 'month';
export type Background = 'retired_railway' | 'retired_govt' | 'private_sector';
export type Sector = 'railways' | 'highways';

export const GROUP_LABELS: Record<string, string> = {
  key_personnel: 'Key personnel',
  technical_staff: 'Engineers & technical staff',
  support_staff: 'Office & support staff',
};

export const BACKGROUND_LABELS: Record<Background, string> = {
  retired_railway: 'Retired from Indian Railways / railway PSU',
  retired_govt: 'Retired from other Govt / PSU (NHAI, PWD, MoRTH…)',
  private_sector: 'Private sector / consultancy',
};

export const SECTOR_LABELS: Record<Sector, string> = {
  railways: 'Railways',
  highways: 'Highways',
};
export type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface Category {
  id: string;
  name: string;
  group: CategoryGroup;
  description: string | null;
}

export interface User {
  id: string;
  phone: string;
  email: string | null;
  role: Role;
  isActive: boolean;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string | null;
  categoryId: string;
  skills: string[];
  yearsExperience: number;
  bio: string | null;
  availability: 'offline' | 'available' | 'engaged';
  minRate: string;
  rateUnit: RateUnit;
  currency: string;
  city: string | null;
  background: Background | null;
  sectors: Sector[];
  qualification: string | null;
  lastDesignation: string | null;
  lastOrganisation: string | null;
  retirementYear: number | null;
  rating: string;
  completedJobs: number;
  verificationStatus: string;
}

export interface ClientProfile {
  id: string;
  userId: string;
  name: string;
  companyName: string | null;
  clientType: 'individual' | 'company';
  address: string | null;
  city: string | null;
}

export interface Job {
  id: string;
  clientId: string;
  categoryId: string;
  title: string;
  description: string | null;
  location: string;
  workersRequired: number;
  offeredRate: string;
  rateUnit: RateUnit;
  currency: string;
  startsAt: string;
  endsAt: string | null;
  status: JobStatus;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  workerId: string;
  proposedRate: string;
  message: string | null;
  status: ApplicationStatus;
  createdAt: string;
}

export interface ResumeMeta {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface RegisterWorkerInput {
  phone: string;
  password: string;
  firstName: string;
  lastName?: string;
  email?: string;
  categoryId: string;
  yearsExperience?: number;
  minRate: string;
  rateUnit?: RateUnit;
  city?: string;
  background?: Background;
  sectors?: Sector[];
  qualification?: string;
  lastDesignation?: string;
  lastOrganisation?: string;
  retirementYear?: number;
}

export interface RegisterClientInput {
  phone: string;
  password: string;
  name: string;
  email?: string;
  companyName?: string;
  clientType?: 'individual' | 'company';
  city?: string;
}
