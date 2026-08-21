import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class SearchWorkersDto {
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional()
  @IsIn(['offline', 'available', 'engaged'])
  availability?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;
}
