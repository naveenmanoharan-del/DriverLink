import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { BACKGROUNDS, SECTORS } from '../../auth/dto/register-worker.dto';

export const PIPELINE = [
  'new',
  'shortlisted',
  'interviewed',
  'placed',
  'on_hold',
  'rejected',
] as const;
export const GROUPS = [
  'key_personnel',
  'technical_staff',
  'support_staff',
] as const;
export const CONTRACT_TYPES = [
  'gc',
  'pmc',
  'pgms',
  'pssa',
  'ae',
  'ie',
  'other',
] as const;
export const PLACEMENT_STATUSES = [
  'active',
  'completed',
  'terminated',
] as const;
export const CANDIDATE_SORTS = [
  'newest',
  'oldest',
  'name',
  'experience_desc',
  'experience_asc',
] as const;

/** Query strings arrive as text; "true"/"false" become booleans. */
const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;
/** Blank query params ("?city=") mean "no filter", not "match empty". */
const blankToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

class PageQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page?: number = 1;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;
}

export class CandidateQueryDto extends PageQuery {
  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(100)
  q?: string;
  @IsOptional()
  @Transform(blankToUndefined)
  @IsIn(GROUPS)
  group?: (typeof GROUPS)[number];
  @IsOptional() @Transform(blankToUndefined) @IsUUID() categoryId?: string;
  @IsOptional()
  @Transform(blankToUndefined)
  @IsIn(BACKGROUNDS)
  background?: (typeof BACKGROUNDS)[number];
  @IsOptional() @Transform(blankToUndefined) @IsIn(SECTORS) sector?: string;
  @IsOptional()
  @Transform(blankToUndefined)
  @IsIn(PIPELINE)
  pipelineStatus?: (typeof PIPELINE)[number];
  @IsOptional()
  @Transform(blankToUndefined)
  @IsIn(['pending', 'verified', 'rejected'])
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  @IsOptional() @Transform(toBool) @IsBoolean() hasResume?: boolean;
  @IsOptional() @Transform(toBool) @IsBoolean() isActive?: boolean;
  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(100)
  city?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(70)
  minExperience?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(70)
  maxExperience?: number;
  @IsOptional()
  @Transform(blankToUndefined)
  @IsDateString()
  registeredFrom?: string;
  @IsOptional()
  @Transform(blankToUndefined)
  @IsDateString()
  registeredTo?: string;
  @IsOptional() @IsIn(CANDIDATE_SORTS) sort?: (typeof CANDIDATE_SORTS)[number] =
    'newest';
}

export class UpdateCandidateDto {
  @IsOptional() @IsIn(PIPELINE) pipelineStatus?: (typeof PIPELINE)[number];
  @IsOptional()
  @IsIn(['pending', 'verified', 'rejected'])
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  @IsOptional() @IsString() @MaxLength(5000) adminNotes?: string;
}

export class ClientQueryDto extends PageQuery {
  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(100)
  q?: string;
  @IsOptional() @Transform(toBool) @IsBoolean() isActive?: boolean;
}

export class SetActiveDto {
  @IsBoolean() isActive!: boolean;
}

export class StatsQueryDto {
  /** Scopes the breakdown charts to people registered in the last N days. */
  @IsOptional() @Type(() => Number) @IsIn([7, 30, 90, 365]) days?: number;
}

export class PlacementQueryDto extends PageQuery {
  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(100)
  q?: string;
  @IsOptional()
  @Transform(blankToUndefined)
  @IsIn(PLACEMENT_STATUSES)
  status?: (typeof PLACEMENT_STATUSES)[number];
  @IsOptional()
  @Transform(blankToUndefined)
  @IsIn(CONTRACT_TYPES)
  contractType?: (typeof CONTRACT_TYPES)[number];
  @IsOptional() @Transform(blankToUndefined) @IsUUID() workerId?: string;
}

export class CreatePlacementDto {
  @IsOptional() @IsUUID() workerId?: string;
  /** Required when no workerId is given; otherwise taken from the profile. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  candidateName?: string;
  @IsOptional() @IsUUID() clientId?: string;
  @IsString() @MinLength(1) @MaxLength(255) companyName!: string;
  @IsString() @MinLength(1) @MaxLength(255) position!: string;
  @IsOptional() @IsString() @MaxLength(255) projectName?: string;
  @IsOptional()
  @IsIn(CONTRACT_TYPES)
  contractType?: (typeof CONTRACT_TYPES)[number];
  @IsOptional() @IsIn(SECTORS) sector?: string;
  @IsOptional() @IsString() @MaxLength(255) location?: string;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional()
  @IsNumberString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/, {
    message:
      'monthlyRemuneration must be a positive amount with at most 2 decimals',
  })
  monthlyRemuneration?: string;
  @IsOptional()
  @IsIn(PLACEMENT_STATUSES)
  status?: (typeof PLACEMENT_STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class UpdatePlacementDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255) companyName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255) position?: string;
  @IsOptional() @IsString() @MaxLength(255) projectName?: string;
  @IsOptional()
  @IsIn(CONTRACT_TYPES)
  contractType?: (typeof CONTRACT_TYPES)[number];
  @IsOptional() @IsIn(SECTORS) sector?: string;
  @IsOptional() @IsString() @MaxLength(255) location?: string;
  @IsOptional() @IsDateString() startDate?: string;
  /** null clears the end date. */
  @IsOptional() @IsDateString() endDate?: string | null;
  @IsOptional()
  @IsNumberString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/, {
    message:
      'monthlyRemuneration must be a positive amount with at most 2 decimals',
  })
  monthlyRemuneration?: string;
  @IsOptional()
  @IsIn(PLACEMENT_STATUSES)
  status?: (typeof PLACEMENT_STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class CreateAdminDto {
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phone must be a valid phone number',
  })
  phone!: string;
  @MinLength(8) @MaxLength(72) password!: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
}

export class AuditQueryDto extends PageQuery {
  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(32)
  targetType?: string;
}
