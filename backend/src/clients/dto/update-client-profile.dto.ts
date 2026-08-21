import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClientProfileDto {
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MaxLength(255) companyName?: string;
  @IsOptional() @IsIn(['individual', 'company']) clientType?:
    'individual' | 'company';
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
}
