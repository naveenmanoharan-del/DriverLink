import { IsIn } from 'class-validator';

export class UpdateJobStatusDto {
  @IsIn(['open', 'assigned', 'in_progress', 'completed', 'cancelled'])
  status!: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
}
