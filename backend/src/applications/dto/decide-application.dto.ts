import { IsIn } from 'class-validator';

export class DecideApplicationDto {
  @IsIn(['accepted', 'rejected'])
  status!: 'accepted' | 'rejected';
}
