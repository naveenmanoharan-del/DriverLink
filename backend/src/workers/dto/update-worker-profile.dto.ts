import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
  ArrayUnique,
  Matches,
} from 'class-validator';
import { BACKGROUNDS, SECTORS } from '../../auth/dto/register-worker.dto';

export class UpdateWorkerProfileDto {
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) yearsExperience?: number;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @IsIn(['offline', 'available', 'engaged']) availability?:
    'offline' | 'available' | 'engaged';
  @IsOptional()
  @IsNumberString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/, {
    message: 'minRate must be a positive amount with at most 2 decimals',
  })
  minRate?: string;
  @IsOptional() @IsIn(['hour', 'day', 'job', 'month']) rateUnit?:
    'hour' | 'day' | 'job' | 'month';
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsIn(BACKGROUNDS) background?: (typeof BACKGROUNDS)[number];
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(SECTORS, { each: true })
  sectors?: string[];
  @IsOptional() @IsString() @MaxLength(255) qualification?: string;
  @IsOptional() @IsString() @MaxLength(255) lastDesignation?: string;
  @IsOptional() @IsString() @MaxLength(255) lastOrganisation?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(2100)
  retirementYear?: number;
}
