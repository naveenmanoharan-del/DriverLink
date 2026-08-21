import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateJobDto {
  @IsUUID() categoryId!: string;
  @IsString() @MaxLength(255) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() location!: string;
  @IsOptional() @Type(() => Number) latitude?: number;
  @IsOptional() @Type(() => Number) longitude?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) workersRequired?: number;
  @IsNumberString() offeredRate!: string;
  @IsOptional() @IsIn(['hour', 'day', 'job']) rateUnit?: 'hour' | 'day' | 'job';
  @IsDateString() startsAt!: string;
  @IsOptional() @IsDateString() endsAt?: string;
}
