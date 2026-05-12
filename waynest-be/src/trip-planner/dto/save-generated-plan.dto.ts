import { IsString, IsNumber, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class SaveGeneratedPlanDto {
  @IsString()
  cityId: string;

  @IsNumber()
  days: number;

  @IsNumber()
  budget: number;

  @IsNumber()
  persons: number;

  @IsObject()
  generatedPlan: any;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsBoolean()
  addToCalendar?: boolean;
}
