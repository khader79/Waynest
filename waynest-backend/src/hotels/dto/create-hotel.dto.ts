import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsUrl,
  Min,
  Max,
} from 'class-validator';

export class CreateHotelDto {
  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsNumber()
  pricePerNight: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  stars: number;

  @IsArray()
  @IsString({ each: true })
  amenities: string[];

  @IsString()
  description: string;

  @IsUrl()
  image: string;

  @IsOptional()
  @IsUrl()
  website?: string;
}
