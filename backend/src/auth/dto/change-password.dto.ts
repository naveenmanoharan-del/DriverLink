import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MaxLength(72)
  currentPassword!: string;

  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
