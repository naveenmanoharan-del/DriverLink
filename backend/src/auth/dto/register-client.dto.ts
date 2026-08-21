import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterClientDto {
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phone must be a valid phone number',
  })
  phone!: string;

  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsIn(['individual', 'company'])
  clientType?: 'individual' | 'company';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}
