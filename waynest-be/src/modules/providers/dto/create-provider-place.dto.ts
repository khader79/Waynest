import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PlaceType } from '../../place/entities/place.entity';

const TIME_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** One row for `PlaceOpeningHour` (0 = Sunday … 6 = Saturday). */
export class ProviderPlaceOpeningHourItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(TIME_HH_MM)
  openTime: string;

  @IsString()
  @Matches(TIME_HH_MM)
  closeTime: string;
}

/** One row for `PlacePricing`. */
export class ProviderPlacePricingItemDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice: number;

  @IsString()
  @Length(3, 3)
  currencyCode: string;

  @IsOptional()
  @IsBoolean()
  perPerson?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPeople?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}

export class CreateProviderPlaceDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 150)
  name: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 8000)
  description: string;

  @IsNotEmpty()
  @IsEnum(PlaceType)
  type: PlaceType;

  @IsNotEmpty()
  @IsLatitude()
  latitude: number;

  @IsNotEmpty()
  @IsLongitude()
  longitude: number;

  @IsNotEmpty()
  @IsUUID()
  cityId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  /** If omitted, a unique slug is generated from the name. */
  @IsOptional()
  @IsString()
  @Length(2, 180)
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Cover image: app upload path or absolute URL; normalized on save. */
  @IsOptional()
  @IsString()
  @Length(0, 2048)
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @ValidateNested({ each: true })
  @Type(() => ProviderPlaceOpeningHourItemDto)
  openingHours?: ProviderPlaceOpeningHourItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @ValidateNested({ each: true })
  @Type(() => ProviderPlacePricingItemDto)
  pricings?: ProviderPlacePricingItemDto[];
}
