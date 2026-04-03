import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { PlaceType } from '../../place/entities/place.entity';

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
}
