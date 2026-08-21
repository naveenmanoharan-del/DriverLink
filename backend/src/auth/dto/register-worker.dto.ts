import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

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

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsExperience?: number;

  @IsNumberString()
  minRate!: string;

  @IsOptional()
  @IsIn(['hour', 'day', 'job'])
  rateUnit?: 'hour' | 'day' | 'job';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}
