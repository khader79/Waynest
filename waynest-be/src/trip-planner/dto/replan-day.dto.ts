import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ReplanDayDto {
  @IsNumber()
  @Min(1)
  dayNumber: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
