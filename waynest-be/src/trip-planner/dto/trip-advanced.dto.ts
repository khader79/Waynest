import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Min,
  Max,
  IsEnum,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export enum TripPace {
  RELAXED = 'relaxed',
  MODERATE = 'moderate',
  INTENSIVE = 'intensive',
}

export enum TransportPreference {
  WALKING = 'walking',
  PUBLIC = 'public',
  MIXED = 'mixed',
  ANY = 'any',
}

export class AdvancedTripOptionsDto {
  @IsOptional()
  @IsEnum(TripPace)
  pace?: TripPace = TripPace.MODERATE;

  @IsOptional()
  @IsEnum(TransportPreference)
  transport?: TransportPreference = TransportPreference.MIXED;

  @IsOptional()
  @IsBoolean()
  includeMeals?: boolean = false;

  @IsOptional()
  @IsBoolean()
  skipPopularSpots?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  startHour?: number = 9;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  endHour?: number = 22;

  @IsOptional()
  @IsString({ each: true })
  excludePlaceIds?: string[] = [];
}

export class GenerateTripDto {
  @IsString()
  cityId: string;

  @IsNumber()
  @Min(1)
  @Max(30)
  days: number;

  @IsNumber()
  @Min(1)
  budget: number;

  @IsNumber()
  @Min(1)
  @Max(50)
  persons: number;

  @IsOptional()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @Type(() => AdvancedTripOptionsDto)
  advancedOptions?: AdvancedTripOptionsDto;
}
