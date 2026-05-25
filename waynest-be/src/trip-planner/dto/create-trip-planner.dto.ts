import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateTripPlannerDto {
  @IsString()
  cityId: string;

  @IsNumber()
  @Min(1)
  days: number;

  @IsNumber()
  @Min(0)
  budget: number;

  @IsNumber()
  @Min(1)
  persons: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interests?: string[];

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsBoolean()
  addToCalendar?: boolean;

  @IsOptional()
  @IsString()
  naturalLanguagePrompt?: string;

  @IsOptional()
  @IsString()
  naturalLanguageCity?: string;

  @IsOptional()
  @IsString()
  naturalLanguageCountry?: string;
}
