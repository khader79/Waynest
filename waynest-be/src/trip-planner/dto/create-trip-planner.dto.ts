import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { TravelerType, MobilityLevel } from '../entities/trip-planner.entity';

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

  @IsOptional()
  @IsIn(['adventure', 'luxury', 'backpacker', 'family', 'solo', 'couple', 'student', 'business'])
  travelerType?: TravelerType;

  @IsOptional()
  @IsIn(['full', 'moderate', 'limited'])
  mobilityLevel?: MobilityLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ageGroups?: string[];
}
