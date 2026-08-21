import {
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateApplicationDto {
  @IsNumberString() proposedRate!: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
}
