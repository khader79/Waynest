import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @IsOptional()
  tripPlanId?: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  splitAmongUserIds!: string[];
}
