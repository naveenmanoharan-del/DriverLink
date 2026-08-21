import { IsString, Matches } from 'class-validator';

export class LoginDto {
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phone must be a valid phone number',
  })
  phone!: string;

  @IsString()
  password!: string;
}
