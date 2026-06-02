import { IsOptional, IsUUID } from 'class-validator';

export class ExpenseQueryDto {
  @IsOptional()
  @IsUUID('4')
  tripPlanId?: string;
}
