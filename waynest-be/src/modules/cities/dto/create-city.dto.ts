import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateCityDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 150)
  name: string;

  @IsUUID()
  country: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  population?: number;

  @IsOptional()
  @IsString()
  @Length(2, 150)
  stateName?: string;
}
