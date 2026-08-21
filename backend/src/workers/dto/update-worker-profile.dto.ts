import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateWorkerProfileDto {
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) yearsExperience?: number;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @IsIn(['offline', 'available', 'engaged']) availability?:
    'offline' | 'available' | 'engaged';
  @IsOptional() @IsNumberString() minRate?: string;
  @IsOptional() @IsIn(['hour', 'day', 'job']) rateUnit?: 'hour' | 'day' | 'job';
  @IsOptional() @IsString() @MaxLength(100) city?: string;
}
