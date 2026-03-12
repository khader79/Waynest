import {
  IsArray,
  IsBoolean,
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
  Max,
  Min,
} from 'class-validator';
import { PlaceType } from '../entities/place.entity';

export class CreatePlaceDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 150)
  name: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 180)
  slug: string;

  @IsNotEmpty()
  @IsString()
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
  provider: string;

  @IsNotEmpty()
  @IsUUID()
  city: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(5)
  ratingAverage?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ratingCount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
