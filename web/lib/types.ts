export type Role = 'worker' | 'client' | 'admin';
export type CategoryGroup = 'physical_labour' | 'driver' | 'artisan' | 'office_staff' | 'other';
export type RateUnit = 'hour' | 'day' | 'job';
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

export interface RegisterWorkerInput {
  phone: string;
  password: string;
  firstName: string;
  lastName?: string;
  categoryId: string;
  yearsExperience?: number;
  minRate: string;
  rateUnit?: RateUnit;
  city?: string;
}

export interface RegisterClientInput {
  phone: string;
  password: string;
  name: string;
  companyName?: string;
  clientType?: 'individual' | 'company';
  city?: string;
}
