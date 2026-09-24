import {
  ArrayUnique,
  IsArray,
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
import { Transform, Type } from 'class-transformer';

export const SECTORS = ['railways', 'highways'] as const;
export const BACKGROUNDS = [
  'retired_railway',
  'retired_govt',
  'private_sector',
] as const;

/**
 * Accepted both as JSON (the mobile app) and as multipart form data (the
 * website, which attaches a resume). Multipart fields all arrive as strings, so
 * numbers are coerced with @Type and `sectors` may come as "railways,highways".
 */
export class RegisterWorkerDto {
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phone must be a valid phone number',
  })
  phone!: string;

  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(70)
  yearsExperience?: number;

  @IsNumberString()
  minRate!: string;

  @IsOptional()
  @IsIn(['hour', 'day', 'job', 'month'])
  rateUnit?: 'hour' | 'day' | 'job' | 'month';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsIn(BACKGROUNDS)
  background?: (typeof BACKGROUNDS)[number];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @ArrayUnique()
  @IsIn(SECTORS, { each: true })
  sectors?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  qualification?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastDesignation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastOrganisation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(2100)
  retirementYear?: number;
}
